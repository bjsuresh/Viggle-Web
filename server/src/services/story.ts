import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { config } from "../config.js";

export const StoryRequest = z.object({
  idea: z.string().min(3).max(2000),
  scenes: z.number().int().min(2).max(12).default(4),
  style: z.string().max(200).default("cinematic"),
  tone: z.string().max(100).default("uplifting"),
  duration_s: z.number().min(5).max(15).default(5),
  aspect_ratio: z.enum(["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"]).default("16:9"),
  characters: z.string().max(500).optional(),
  language: z.string().max(40).default("English"),
});
export type StoryRequestT = z.infer<typeof StoryRequest>;

const SceneSchema = z.object({
  title: z.string(),
  narration: z.string(),
  video_prompt: z.string(),
  image_prompt: z.string(),
  camera: z.string(),
  mood: z.string(),
});
const StoryPlanSchema = z.object({
  title: z.string(),
  logline: z.string(),
  style_guide: z.string(),
  scenes: z.array(SceneSchema),
});
export type StoryPlan = z.infer<typeof StoryPlanSchema> & { planner: "claude" | "template" };

const SYSTEM = `You are a story-to-video director. You turn a short idea into a shot list for an AI video generator (Viggle H3, 5-15 second clips with native audio).
Rules:
- Each scene is ONE continuous shot, visually self-contained, described in present tense.
- video_prompt: concrete subject, action, setting, lighting, camera movement, and sound cues. 40-90 words. Repeat the style guide and recurring character descriptions in EVERY scene so the clips look consistent.
- image_prompt: a still keyframe version of the same shot (no motion words), same style and characters.
- narration: one or two spoken sentences in the requested language, suitable for voice-over or captions.
- camera: short phrase such as "slow dolly in" or "handheld tracking shot".
- Keep content family-friendly and avoid real people, logos and brands.`;

/** Plan a story with Claude when a key is configured, otherwise with the built-in template planner. */
export async function planStory(input: StoryRequestT): Promise<StoryPlan> {
  if (config.anthropicApiKey) {
    try {
      return await planWithClaude(input);
    } catch (err) {
      console.warn("[story] Claude planner failed, using template planner:", err instanceof Error ? err.message : err);
    }
  }
  return planWithTemplate(input);
}

async function planWithClaude(input: StoryRequestT): Promise<StoryPlan> {
  const client = new Anthropic({ apiKey: config.anthropicApiKey });
  const user = [
    `Idea: ${input.idea}`,
    `Number of scenes: ${input.scenes}`,
    `Visual style: ${input.style}`,
    `Tone: ${input.tone}`,
    `Clip length per scene: ${input.duration_s} seconds`,
    `Aspect ratio: ${input.aspect_ratio}`,
    input.characters ? `Recurring characters: ${input.characters}` : "",
    `Narration language: ${input.language}`,
    `Return exactly ${input.scenes} scenes.`,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    system: SYSTEM,
    messages: [{ role: "user", content: user }],
    output_config: { format: zodOutputFormat(StoryPlanSchema), effort: "medium" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  } as never);

  const parsed = (response as unknown as { parsed_output: z.infer<typeof StoryPlanSchema> | null }).parsed_output;
  if (!parsed) throw new Error("Claude returned no structured plan");
  return { ...parsed, scenes: parsed.scenes.slice(0, input.scenes), planner: "claude" };
}

const BEATS = [
  { title: "Opening", mood: "calm, inviting", camera: "slow establishing wide shot, gentle push in", beat: "introduces the world and the main subject of" },
  { title: "Spark", mood: "curious, hopeful", camera: "medium shot, smooth dolly forward", beat: "shows the first surprising moment in" },
  { title: "Rising", mood: "energetic, building tension", camera: "handheld tracking shot following the action", beat: "raises the stakes of" },
  { title: "Turn", mood: "dramatic, intense", camera: "low angle, dynamic orbit", beat: "presents the biggest challenge in" },
  { title: "Climax", mood: "triumphant, powerful", camera: "fast crane shot rising above the scene", beat: "reaches the peak moment of" },
  { title: "Resolution", mood: "warm, satisfying", camera: "slow pull back to a wide shot", beat: "resolves and closes",
  },
  { title: "Epilogue", mood: "reflective, serene", camera: "static wide shot, golden light", beat: "offers a final reflection on" },
];

function planWithTemplate(input: StoryRequestT): StoryPlan {
  const n = input.scenes;
  const picks = pickBeats(n);
  const chars = input.characters ? ` Characters: ${input.characters}.` : "";
  const styleGuide = `${input.style} look, ${input.tone} tone, consistent color palette, ${input.aspect_ratio} framing.${chars}`;
  const scenes = picks.map((b, i) => {
    const base = `${b.beat} "${input.idea}"`;
    return {
      title: `${i + 1}. ${b.title}`,
      narration: `${b.title}: ${sentenceFor(b.title, input.idea)}`,
      video_prompt: `A ${input.style} shot that ${base}. ${b.camera}. Mood: ${b.mood}. Natural ambient sound and subtle music. ${styleGuide}`,
      image_prompt: `${input.style} still frame that ${base}. ${b.mood} lighting. ${styleGuide}`,
      camera: b.camera,
      mood: b.mood,
    };
  });
  return {
    title: titleCase(input.idea.split(/[.!?]/)[0].slice(0, 60)),
    logline: input.idea,
    style_guide: styleGuide,
    scenes,
    planner: "template",
  };
}

function pickBeats(n: number) {
  if (n >= BEATS.length) return Array.from({ length: n }, (_, i) => BEATS[i % BEATS.length]);
  const idx = Array.from({ length: n }, (_, i) => Math.round((i * (BEATS.length - 1)) / (n - 1)));
  return idx.map((i) => BEATS[i]);
}

function sentenceFor(beat: string, idea: string): string {
  const map: Record<string, string> = {
    Opening: `It all begins with ${idea}.`,
    Spark: `Something unexpected changes everything.`,
    Rising: `Every step forward brings a new challenge.`,
    Turn: `Just when it seems impossible, a choice has to be made.`,
    Climax: `This is the moment everything was leading to.`,
    Resolution: `And so, a new chapter begins.`,
    Epilogue: `Some stories never really end.`,
  };
  return map[beat] ?? idea;
}

function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1));
}
