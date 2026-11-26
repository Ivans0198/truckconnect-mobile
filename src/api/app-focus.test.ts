import { focusManager } from "@tanstack/react-query";
import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";

import { connectAppFocus } from "./app-focus";

describe("connectAppFocus", () => {
  let listener: ((status: AppStateStatus) => void) | undefined;
  const remove = jest.fn();

  beforeEach(() => {
    listener = undefined;
    remove.mockClear();
    jest.spyOn(AppState, "addEventListener").mockImplementation((_, cb) => {
      listener = cb;
      return { remove };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    focusManager.setFocused(undefined);
  });

  it("focuses TanStack when the app becomes active", () => {
    const disconnect = connectAppFocus();
    listener?.("background");
    listener?.("active");
    expect(focusManager.isFocused()).toBe(true);
    disconnect();
  });

  it("unfocuses TanStack when the app goes to the background", () => {
    const disconnect = connectAppFocus();
    listener?.("background");
    expect(focusManager.isFocused()).toBe(false);
    disconnect();
  });

  it("stops listening once disconnected", () => {
    connectAppFocus()();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
