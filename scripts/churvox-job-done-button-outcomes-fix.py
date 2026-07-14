#!/usr/bin/env python3
"""Give every Job Done and Money Radar control a visible or navigation outcome."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f"Could not find {label}")
    return text.replace(old, new, 1)


def main():
    router_path = ROOT / "frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx"
    router = router_path.read_text(encoding="utf-8")
    router = replace_once(
        router,
        '  if (screen === "work") return <WorkScreen appMode={appMode} />;\n',
        '  if (screen === "work") return <WorkScreen appMode={appMode} go={props.go} />;\n',
        "Jobs navigation prop",
    )
    router = replace_once(
        router,
        '  if (screen === "money") return <MoneyScreen appMode={appMode} />;\n',
        '  if (screen === "money") return <MoneyScreen appMode={appMode} go={props.go} />;\n',
        "Money navigation prop",
    )
    router_path.write_text(router, encoding="utf-8")

    done_path = ROOT / "frontend/src/churvox-office-lab/OfficeTeamJobDone.js"
    done = done_path.read_text(encoding="utf-8")
    done = replace_once(
        done,
        '''  async function prepare(intent, openCommand = false) {
    if (!selected || busy || reality.preview) {
      if (reality.preview && openCommand) go?.("command");
      return;
    }
    setBusy(intent);
''',
        '''  async function prepare(intent, openCommand = false) {
    if (!selected || busy) return;
    if (reality.preview) {
      setNotice(intent === "review_proof_time"
        ? "Preview review opened. Proof, time and extras remain editable; nothing was changed."
        : "Preview Job Done closeout prepared. Nothing was sent, synced, charged or changed.");
      if (openCommand) go?.("command");
      return;
    }
    setBusy(intent);
''',
        "preview Job Done outcome",
    )
    done_path.write_text(done, encoding="utf-8")
    print("Job Done and Money Radar button outcomes repaired.")


if __name__ == "__main__":
    main()
