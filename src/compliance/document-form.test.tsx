import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import { StyleSheet } from "react-native";

import { documentsPage } from "@/test/compliance-fixtures";
import { renderWithQuery } from "@/test/render";
import { apiUrl, server } from "@/test/server";
import { fontSize, TOUCH_TARGET_MIN } from "@/theme/tokens";

import { DocumentForm } from "./document-form";
import { chooseFile, takePhoto } from "./pick-file";
import { useComplianceDocuments } from "./queries";

const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack }),
}));

jest.mock("./pick-file", () => ({
  takePhoto: jest.fn(),
  chooseFile: jest.fn(),
}));

const mockOpenDatePicker = jest.fn();
jest.mock("@react-native-community/datetimepicker", () => ({
  DateTimePickerAndroid: {
    open: (options: unknown) => mockOpenDatePicker(options),
  },
}));

jest.mock("@/uploads/read-file", () => ({
  readFile: jest.fn(async () => ({
    body: new Blob(["pdf-bytes"], { type: "application/pdf" }),
    sizeBytes: 9,
  })),
}));

const UPLOAD_URL = "https://uploads.test/documents/renewal.pdf";
const PDF = {
  uri: "file:///tmp/policy.pdf",
  name: "policy.pdf",
  mimeType: "application/pdf",
};
const PHOTO = {
  uri: "file:///tmp/photo.jpg",
  name: "photo.jpg",
  mimeType: "image/jpeg",
};

const mockChooseFile = jest.mocked(chooseFile);
const mockTakePhoto = jest.mocked(takePhoto);

type Recorded = { uploadUrlBody?: unknown; registerBody?: unknown };

function serveUpload(): Recorded {
  const recorded: Recorded = {};
  server.use(
    http.post(
      apiUrl("/compliance/documents/upload-url"),
      async ({ request }) => {
        recorded.uploadUrlBody = await request.json();
        return HttpResponse.json({
          uploadUrl: UPLOAD_URL,
          fileKey: "documents/renewal.pdf",
          expiresInSeconds: 900,
        });
      },
    ),
    http.put(UPLOAD_URL, () => new HttpResponse(null, { status: 200 })),
    http.post(apiUrl("/compliance/documents"), async ({ request }) => {
      recorded.registerBody = await request.json();
      return HttpResponse.json({ id: "new-doc" }, { status: 201 });
    }),
  );
  return recorded;
}

function pickDates(...dates: Date[]): void {
  for (const date of dates) {
    mockOpenDatePicker.mockImplementationOnce(
      ({ onChange }: { onChange: (event: unknown, date: Date) => void }) =>
        onChange({ type: "set" }, date),
    );
  }
}

const ISSUE = new Date(2026, 5, 17);
const EXPIRY = new Date(2027, 5, 17);

async function fillTheForm(): Promise<void> {
  mockChooseFile.mockResolvedValueOnce({ kind: "picked", file: PDF });
  pickDates(ISSUE, EXPIRY);
  await fireEvent.press(screen.getByRole("button", { name: "Choose file" }));
  await screen.findByText("policy.pdf");
  await fireEvent.press(screen.getByRole("button", { name: /Issue date/ }));
  await fireEvent.press(screen.getByRole("button", { name: /Expiry date/ }));
}

function submit(): Promise<void> {
  return fireEvent.press(screen.getByRole("button", { name: "Submit" }));
}

beforeEach(() => {
  mockBack.mockClear();
  mockOpenDatePicker.mockReset();
  mockChooseFile.mockReset();
  mockTakePhoto.mockReset();
});

describe("DocumentForm: choosing the type", () => {
  it("comes with the type of the card it was opened from", async () => {
    await renderWithQuery(<DocumentForm initialType="PUBLIC_LIABILITY" />);

    expect(screen.getByText("Public Liability")).toBeOnTheScreen();
    expect(screen.queryByText("Driver Licence")).not.toBeOnTheScreen();
  });

  it("offers the five types first when opened from the plus", async () => {
    await renderWithQuery(<DocumentForm />);

    for (const name of [
      "Driver Licence",
      "Vehicle Registration",
      "Public Liability",
      "Trailer Registration",
      "Dangerous Goods",
    ]) {
      expect(screen.getByRole("radio", { name })).toBeOnTheScreen();
    }
  });

  it("collapses to the chosen type and lets the driver change it", async () => {
    await renderWithQuery(<DocumentForm />);

    await fireEvent.press(
      screen.getByRole("radio", { name: "Trailer Registration" }),
    );
    expect(screen.queryByRole("radio")).not.toBeOnTheScreen();
    expect(screen.getByText("Trailer Registration")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Change type" }));
    expect(screen.getAllByRole("radio")).toHaveLength(5);
  });
});

describe("DocumentForm: the file", () => {
  it("explains the camera before asking, then previews the photo", async () => {
    mockTakePhoto.mockResolvedValueOnce({ kind: "picked", file: PHOTO });
    await renderWithQuery(<DocumentForm initialType="PUBLIC_LIABILITY" />);

    await fireEvent.press(screen.getByRole("button", { name: "Take photo" }));
    expect(screen.getByText(/needs the camera/)).toBeOnTheScreen();
    expect(mockTakePhoto).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));

    expect(mockTakePhoto).toHaveBeenCalledTimes(1);
    expect(await screen.findByLabelText("Photo preview")).toBeOnTheScreen();
    expect(screen.queryByText(/needs the camera/)).not.toBeOnTheScreen();
  });

  it("explains how to enable the camera when it was denied and keeps Choose file", async () => {
    mockTakePhoto.mockResolvedValueOnce({ kind: "permission-denied" });
    await renderWithQuery(<DocumentForm initialType="PUBLIC_LIABILITY" />);

    await fireEvent.press(screen.getByRole("button", { name: "Take photo" }));
    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));

    expect(
      await screen.findByText(/in your phone's Settings/),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Choose file" }),
    ).toBeOnTheScreen();
  });

  it("shows the name of the chosen file", async () => {
    mockChooseFile.mockResolvedValueOnce({ kind: "picked", file: PDF });
    await renderWithQuery(<DocumentForm initialType="PUBLIC_LIABILITY" />);

    await fireEvent.press(screen.getByRole("button", { name: "Choose file" }));

    expect(await screen.findByText("policy.pdf")).toBeOnTheScreen();
  });

  it("keeps the previous file when the picker is cancelled", async () => {
    mockChooseFile
      .mockResolvedValueOnce({ kind: "picked", file: PDF })
      .mockResolvedValueOnce({ kind: "cancelled" });
    await renderWithQuery(<DocumentForm initialType="PUBLIC_LIABILITY" />);

    await fireEvent.press(screen.getByRole("button", { name: "Choose file" }));
    await screen.findByText("policy.pdf");
    await fireEvent.press(
      screen.getByRole("button", { name: /Choose file|Change file/ }),
    );

    expect(await screen.findByText("policy.pdf")).toBeOnTheScreen();
  });
});

describe("DocumentForm: validation", () => {
  it("marks every missing field and sends nothing", async () => {
    await renderWithQuery(<DocumentForm />);

    await submit();

    expect(screen.getByText("Choose a document type.")).toBeOnTheScreen();
    expect(screen.getByText("Add a photo or a file.")).toBeOnTheScreen();
    expect(screen.getByText("Select the issue date.")).toBeOnTheScreen();
    expect(screen.getByText("Select the expiry date.")).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("marks an expiry that is not after the issue date", async () => {
    mockChooseFile.mockResolvedValueOnce({ kind: "picked", file: PDF });
    pickDates(EXPIRY, ISSUE);
    await renderWithQuery(<DocumentForm initialType="PUBLIC_LIABILITY" />);
    await fireEvent.press(screen.getByRole("button", { name: "Choose file" }));
    await screen.findByText("policy.pdf");
    await fireEvent.press(screen.getByRole("button", { name: /Issue date/ }));
    await fireEvent.press(screen.getByRole("button", { name: /Expiry date/ }));

    await submit();

    expect(
      screen.getByText("The expiry date must be after the issue date."),
    ).toBeOnTheScreen();
  });

  it("clears an error once the field is fixed", async () => {
    await renderWithQuery(<DocumentForm initialType="PUBLIC_LIABILITY" />);
    await submit();
    expect(screen.getByText("Select the issue date.")).toBeOnTheScreen();

    pickDates(ISSUE);
    await fireEvent.press(screen.getByRole("button", { name: /Issue date/ }));

    expect(screen.queryByText("Select the issue date.")).not.toBeOnTheScreen();
  });

  it("rejects a file that is not a PDF, JPEG or PNG", async () => {
    mockChooseFile.mockResolvedValueOnce({
      kind: "picked",
      file: { uri: "file:///tmp/a.txt", name: "a.txt", mimeType: "text/plain" },
    });
    await renderWithQuery(<DocumentForm initialType="PUBLIC_LIABILITY" />);
    await fireEvent.press(screen.getByRole("button", { name: "Choose file" }));
    await screen.findByText("a.txt");

    await submit();

    expect(screen.getByText("Use a PDF, JPEG or PNG file.")).toBeOnTheScreen();
  });
});

describe("DocumentForm: submitting", () => {
  it("asks for the URL, uploads, registers the document and goes back with the list refreshed", async () => {
    const recorded = serveUpload();
    let listReads = 0;
    server.use(
      http.get(apiUrl("/compliance/documents"), () => {
        listReads += 1;
        return HttpResponse.json(documentsPage([]));
      }),
    );
    function List(): null {
      useComplianceDocuments();
      return null;
    }
    await renderWithQuery(
      <>
        <List />
        <DocumentForm initialType="PUBLIC_LIABILITY" />
      </>,
    );
    await waitFor(() => expect(listReads).toBe(1));
    await fillTheForm();

    await submit();

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
    expect(recorded.uploadUrlBody).toEqual({
      docType: "PUBLIC_LIABILITY",
      mimeType: "application/pdf",
      fileSizeBytes: 9,
    });
    expect(recorded.registerBody).toEqual({
      docType: "PUBLIC_LIABILITY",
      issueDate: "2026-06-17",
      expiryDate: "2027-06-17",
      fileKey: "documents/renewal.pdf",
      fileMimeType: "application/pdf",
      fileSizeBytes: 9,
    });
    await waitFor(() => expect(listReads).toBe(2));
  });

  it("sends a single document on a second tap and announces the progress", async () => {
    serveUpload();
    let registrations = 0;
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post(apiUrl("/compliance/documents"), async () => {
        registrations += 1;
        await gate;
        return HttpResponse.json({ id: "new-doc" }, { status: 201 });
      }),
    );
    await renderWithQuery(<DocumentForm initialType="PUBLIC_LIABILITY" />);
    await fillTheForm();

    await submit();
    const progress = await screen.findByText("Uploading your document...");
    expect(progress.props.accessibilityLiveRegion).toBe("polite");
    await submit();
    release();

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
    expect(registrations).toBe(1);
  });

  it("asks for a new upload URL without showing an error when the first one is rejected as expired", async () => {
    let urlRequests = 0;
    let puts = 0;
    server.use(
      http.post(apiUrl("/compliance/documents/upload-url"), () => {
        urlRequests += 1;
        return HttpResponse.json({
          uploadUrl: UPLOAD_URL,
          fileKey: `documents/renewal-${urlRequests}.pdf`,
          expiresInSeconds: 900,
        });
      }),
      http.put(UPLOAD_URL, () => {
        puts += 1;
        return new HttpResponse(null, { status: puts === 1 ? 403 : 200 });
      }),
      http.post(apiUrl("/compliance/documents"), () =>
        HttpResponse.json({ id: "new-doc" }, { status: 201 }),
      ),
    );
    await renderWithQuery(<DocumentForm initialType="PUBLIC_LIABILITY" />);
    await fillTheForm();

    await submit();

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
    expect(urlRequests).toBe(2);
    expect(screen.queryByText(/not uploaded/)).not.toBeOnTheScreen();
  });
});

describe("DocumentForm: failures", () => {
  it("says the document was not uploaded, keeps the form and retries", async () => {
    server.use(
      http.post(
        apiUrl("/compliance/documents/upload-url"),
        () => new HttpResponse(null, { status: 500 }),
      ),
    );
    await renderWithQuery(<DocumentForm initialType="PUBLIC_LIABILITY" />);
    await fillTheForm();

    await submit();

    expect(
      await screen.findByText(/The document was not uploaded/),
    ).toBeOnTheScreen();
    expect(screen.getByText("policy.pdf")).toBeOnTheScreen();
    expect(screen.getByText("17 Jun 2026")).toBeOnTheScreen();

    serveUpload();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  });

  it("says the document was not uploaded when there is no network", async () => {
    server.use(
      http.post(apiUrl("/compliance/documents/upload-url"), () =>
        HttpResponse.error(),
      ),
    );
    await renderWithQuery(<DocumentForm initialType="PUBLIC_LIABILITY" />);
    await fillTheForm();

    await submit();

    expect(
      await screen.findByText(/The document was not uploaded/),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Try again" })).toBeOnTheScreen();
  });

  it("asks to try again shortly on a 429 and keeps what was typed", async () => {
    server.use(
      http.post(
        apiUrl("/compliance/documents/upload-url"),
        () => new HttpResponse(null, { status: 429 }),
      ),
    );
    await renderWithQuery(<DocumentForm initialType="PUBLIC_LIABILITY" />);
    await fillTheForm();

    await submit();

    expect(
      await screen.findByText("Too many requests. Try again shortly."),
    ).toBeOnTheScreen();
    expect(screen.getByText("policy.pdf")).toBeOnTheScreen();
  });

  it("shows the message of the back on a 400", async () => {
    serveUpload();
    server.use(
      http.post(apiUrl("/compliance/documents"), () =>
        HttpResponse.json(
          { statusCode: 400, message: "expiryDate must be in the future" },
          { status: 400 },
        ),
      ),
    );
    await renderWithQuery(<DocumentForm initialType="PUBLIC_LIABILITY" />);
    await fillTheForm();

    await submit();

    expect(
      await screen.findByText("expiryDate must be in the future"),
    ).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
  });
});

describe("DocumentForm: driver ergonomics", () => {
  it("draws buttons and date fields at least 60 tall and no text under 16", async () => {
    mockChooseFile.mockResolvedValueOnce({ kind: "picked", file: PDF });
    await renderWithQuery(<DocumentForm />);
    await fireEvent.press(screen.getByRole("button", { name: "Choose file" }));
    await screen.findByText("policy.pdf");
    await submit();

    const targets = [
      ...screen.getAllByRole("button"),
      ...screen.getAllByRole("radio"),
    ];
    for (const target of targets) {
      const style = StyleSheet.flatten(target.props.style);
      expect(style.minHeight ?? style.height).toBeGreaterThanOrEqual(
        TOUCH_TARGET_MIN,
      );
    }
    expect(
      screen.getByRole("button", { name: /Issue date/ }),
    ).toBeOnTheScreen();
    for (const text of screen.getAllByText(/.+/)) {
      expect(
        StyleSheet.flatten(text.props.style)?.fontSize,
      ).toBeGreaterThanOrEqual(fontSize.body);
    }
  });
});
