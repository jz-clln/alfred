# Alfred: themed dropdown (Radix Select)

Needs phases 1 to 4 applied first.

## Install
npm i @radix-ui/react-select

## Apply (Windows, from the project root)
robocopy .\alfred-shadcn-select . /E
Then delete the extracted folder.

## Files
components\ui\select.tsx                        NEW
app\(app)\meetings\ScheduleMeetingForm.tsx      client + length
app\(app)\projects\AddProjectForm.tsx           client
app\(app)\clients\[id]\AddBalanceEntryForm.tsx  entry type
app\(app)\outreach\ComposeForm.tsx              follow-up sequence

## Use it anywhere
<Select id="x" name="field" required placeholder="Choose…"
        options={[{ value: "a", label: "A" }]} />
Add emptyLabel="None" for an optional field that posts "".

## Notes
- Works in plain server-action forms. A hidden input posts the value and does
  the "required" check. Form reset (after a save) clears it too.
- Keyboard: arrows, Enter, Escape, type-to-jump.
- Menu rows are 44px. Colours come from your theme.
- With no clients, meeting and project forms now say so and disable the picker.
- native-select.tsx is now unused. Delete it when you are happy.
