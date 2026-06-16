export async function copyTextOrPrompt(text: string, promptLabel: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    window.prompt(promptLabel, text);
    return false;
  }
}
