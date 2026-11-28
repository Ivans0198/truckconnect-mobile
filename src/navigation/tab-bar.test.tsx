import {
  fireEvent,
  renderRouter,
  screen,
  waitFor,
  within,
} from "expo-router/testing-library";

import { summarizeDocuments } from "@/compliance/attention";
import type { ComplianceDocument } from "@/compliance/types";
import { COMPLIANCE_NOW, approvedExpiringIn } from "@/test/compliance-fixtures";
import { colors, fontSize, TOUCH_TARGET_MIN } from "@/theme/tokens";

import TabsLayout from "../../app/(tabs)/_layout";

// La lectura de documentos tiene su propia prueba; aquí solo importa que la
// barra pinte el punto cuando el resumen pide atención.
const mockAttention = jest.fn();
jest.mock("@/compliance/queries", () => ({
  useComplianceAttention: () => mockAttention() as unknown,
}));

const nearExpiry = approvedExpiringIn("a", "PUBLIC_LIABILITY", 32);
const summaryFor = (documents: ComplianceDocument[]) =>
  summarizeDocuments(documents, COMPLIANCE_NOW);

const SCREEN = () => null;
const routes = {
  "(tabs)/_layout": TabsLayout,
  "(tabs)/index": SCREEN,
  "(tabs)/fatigue": SCREEN,
  "(tabs)/docs": SCREEN,
  "(tabs)/profile": SCREEN,
};

describe("tab bar", () => {
  beforeEach(() => mockAttention.mockReturnValue(undefined));

  it("shows Home, Fatigue, Docs and Profile in that order", async () => {
    await renderRouter(routes, { initialUrl: "/" });

    const tabs = await screen.findAllByRole("tab");

    expect(tabs).toHaveLength(4);
    ["Home", "Fatigue", "Docs", "Profile"].forEach((name, index) => {
      expect(within(tabs[index]!).getByText(name)).toBeOnTheScreen();
    });
  });

  it("marks only the active tab as selected", async () => {
    await renderRouter(routes, { initialUrl: "/docs" });

    const tabs = await screen.findAllByRole("tab");

    expect(tabs.map((tab) => tab.props.accessibilityState?.selected)).toEqual([
      false,
      false,
      true,
      false,
    ]);
  });

  it("groups the tabs in a tablist", async () => {
    await renderRouter(routes, { initialUrl: "/" });

    const [firstTab] = await screen.findAllByRole("tab");

    expect(firstTab?.parent?.props.accessibilityRole).toBe("tablist");
  });

  it("uses a muted color with enough contrast for the inactive tabs", async () => {
    await renderRouter(routes, { initialUrl: "/" });

    await screen.findAllByRole("tab");

    expect(screen.getByText("Fatigue")).toHaveStyle({
      color: colors.textMuted,
    });
  });

  it("moves the selection when another tab is pressed", async () => {
    await renderRouter(routes, { initialUrl: "/" });

    await screen.findAllByRole("tab");
    await fireEvent.press(screen.getByRole("tab", { name: "Profile" }));

    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Profile" })).toBeSelected(),
    );
  });

  it("gives every tab at least the minimum touch target in both directions", async () => {
    await renderRouter(routes, { initialUrl: "/" });

    const tabs = await screen.findAllByRole("tab");

    for (const tab of tabs) {
      expect(tab).toHaveStyle({
        minHeight: TOUCH_TARGET_MIN,
        minWidth: TOUCH_TARGET_MIN,
      });
    }
  });

  it("draws each label at body size or larger", async () => {
    await renderRouter(routes, { initialUrl: "/" });

    await screen.findAllByRole("tab");

    for (const label of ["Home", "Fatigue", "Docs", "Profile"]) {
      expect(screen.getByText(label)).toHaveStyle({ fontSize: fontSize.body });
    }
  });

  describe("Docs attention dot", () => {
    it("shows the dot and ends the accessible name with ', needs attention' when a document needs attention", async () => {
      mockAttention.mockReturnValue(summaryFor([nearExpiry]));
      await renderRouter(routes, { initialUrl: "/" });

      const docs = await screen.findByRole("tab", {
        name: "Docs, needs attention",
      });

      expect(within(docs).getByTestId("tab-badge")).toBeOnTheScreen();
      expect(
        screen.queryByRole("tab", { name: "Fatigue, needs attention" }),
      ).not.toBeOnTheScreen();
    });

    it("draws no dot and keeps the plain name when nothing needs attention", async () => {
      mockAttention.mockReturnValue(summaryFor([]));
      await renderRouter(routes, { initialUrl: "/" });

      const docs = await screen.findByRole("tab", { name: "Docs" });

      expect(within(docs).queryByTestId("tab-badge")).not.toBeOnTheScreen();
    });

    it("draws no dot while the documents have not loaded or failed", async () => {
      mockAttention.mockReturnValue(undefined);
      await renderRouter(routes, { initialUrl: "/" });

      const docs = await screen.findByRole("tab", { name: "Docs" });

      expect(within(docs).queryByTestId("tab-badge")).not.toBeOnTheScreen();
    });
  });
});
