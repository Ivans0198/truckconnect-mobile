import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { TOUCH_TARGET_MIN } from "@/theme/tokens";

import { ConfirmDialog } from "./confirm-dialog";

async function renderDialog(overrides: { visible?: boolean } = {}) {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  await render(
    <ConfirmDialog
      visible={overrides.visible ?? true}
      title="Log out?"
      confirmLabel="Log out"
      cancelLabel="Cancel"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  );
  return { onConfirm, onCancel };
}

describe("ConfirmDialog", () => {
  it("shows the title and both actions as buttons", async () => {
    await renderDialog();

    expect(screen.getByText("Log out?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Log out" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
  });

  it.each(["Log out", "Cancel"])(
    "makes the %s button at least TOUCH_TARGET_MIN tall",
    async (name) => {
      await renderDialog();

      const style = StyleSheet.flatten(
        screen.getByRole("button", { name }).props.style,
      );

      expect(style.minHeight).toBeGreaterThanOrEqual(TOUCH_TARGET_MIN);
    },
  );

  it("calls onConfirm when the driver confirms", async () => {
    const { onConfirm, onCancel } = await renderDialog();

    await fireEvent.press(screen.getByRole("button", { name: "Log out" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("calls onCancel without confirming when the driver cancels", async () => {
    const { onConfirm, onCancel } = await renderDialog();

    await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("renders nothing while it is not visible", async () => {
    await renderDialog({ visible: false });

    expect(screen.queryByText("Log out?")).toBeNull();
  });
});
