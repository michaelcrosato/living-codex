import { Story } from "inkjs";
import { Compiler } from "inkjs/full";
import type { CompiledInk, Choice, Narrative, StoryFrame, StorySession } from "@codex/engine-core";

/**
 * The ONLY package that imports inkjs (vendor isolation, AGENTS.md). Implements engine-core's
 * Narrative port over the inkjs runtime. `save()`/`load()` wrap inkjs `state.ToJson/LoadJson`,
 * which is how the engine captures full Ink state into the event log and restores it on replay
 * instead of re-running Ink (WORLD_STATE.md §4).
 */
type VarBag = Record<string, string | number | boolean>;

class InkSession implements StorySession {
  private readonly story: Story;

  constructor(compiled: CompiledInk) {
    this.story = new Story(compiled as ConstructorParameters<typeof Story>[0]);
  }

  current(): StoryFrame {
    let text = "";
    const tags: string[] = [];
    while (this.story.canContinue) {
      text += this.story.Continue() ?? "";
      for (const tag of this.story.currentTags ?? []) tags.push(tag);
    }
    const choices: Choice[] = this.story.currentChoices.map((choice, index) => ({
      index,
      text: choice.text ?? "",
    }));
    return { text: text.trim(), tags, choices };
  }

  choose(choiceIndex: number): void {
    this.story.ChooseChoiceIndex(choiceIndex);
  }

  getVar(name: string): string | number | boolean {
    return (this.story.variablesState as unknown as VarBag)[name] ?? false;
  }

  setVar(name: string, value: string | number | boolean): void {
    (this.story.variablesState as unknown as VarBag)[name] = value;
  }

  save(): string {
    return this.story.state.ToJson();
  }

  load(serialized: string): void {
    this.story.state.LoadJson(serialized);
  }
}

export class InkNarrative implements Narrative {
  load(compiled: CompiledInk): StorySession {
    return new InkSession(compiled);
  }
}

/** Compile Ink source to the opaque CompiledInk the engine stores in DialogueAssets. */
export function compileInk(source: string): CompiledInk {
  const json = new Compiler(source).Compile().ToJson();
  if (!json) throw new Error("compileInk: compiler produced no output");
  return JSON.parse(json) as CompiledInk;
}
