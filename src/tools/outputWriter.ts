import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun
} from "docx";

export interface OutputWriteResult {
  outputPath: string;
  fileName: string;
}

export interface StructuredAgentOutput {
  title: string;
  summary: string;
  nextSteps?: string[];
  tableRows?: Record<string, string | number | boolean | null | undefined>[];
  notebookCode?: string;
}

function prepareOutputPath(outputPath: string): OutputWriteResult {
  const absolutePath = path.resolve(process.cwd(), outputPath);
  const fileName = path.basename(absolutePath);
  const folderPath = path.dirname(absolutePath);

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  return {
    outputPath: absolutePath,
    fileName
  };
}

export function saveAgentOutput(outputPath: string, content: string): OutputWriteResult {
  const result = prepareOutputPath(outputPath);
  fs.writeFileSync(result.outputPath, content, "utf-8");
  return result;
}

export function formatSavedOutputContent(
  title: string,
  summary: string,
  nextSteps: string[] = []
): string {
  const nextStepsText =
    nextSteps.length > 0
      ? nextSteps.map((step, index) => `${index + 1}. ${step}`).join("\n")
      : "No next steps provided.";

  return `# ${title}

## Response

${summary}

## Next Steps

${nextStepsText}
`;
}

export async function saveAgentOutputFile(
  outputPath: string,
  data: StructuredAgentOutput
): Promise<OutputWriteResult> {
  const extension = path.extname(outputPath).toLowerCase();

  switch (extension) {
    case ".docx":
      return saveWordDocument(outputPath, data);

    case ".xlsx":
      return saveExcelWorkbook(outputPath, data);

    case ".pdf":
      return savePdfDocument(outputPath, data);

    case ".ipynb":
      return saveJupyterNotebook(outputPath, data);

    case ".md":
    case ".txt":
    default:
      return saveAgentOutput(
        outputPath,
        formatSavedOutputContent(data.title, data.summary, data.nextSteps ?? [])
      );
  }
}

async function saveWordDocument(
  outputPath: string,
  data: StructuredAgentOutput
): Promise<OutputWriteResult> {
  const result = prepareOutputPath(outputPath);

  const children: Paragraph[] = [
    new Paragraph({
      text: data.title,
      heading: HeadingLevel.TITLE
    }),
    new Paragraph({
      text: "Response",
      heading: HeadingLevel.HEADING_1
    }),
    ...data.summary.split("\n").map(
      line =>
        new Paragraph({
          children: [new TextRun(line)]
        })
    ),
    new Paragraph({
      text: "Next Steps",
      heading: HeadingLevel.HEADING_1
    })
  ];

  const nextSteps = data.nextSteps ?? [];

  if (nextSteps.length > 0) {
    nextSteps.forEach((step, index) => {
      children.push(
        new Paragraph({
          text: `${index + 1}. ${step}`
        })
      );
    });
  } else {
    children.push(
      new Paragraph({
        text: "No next steps provided."
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        children
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(result.outputPath, buffer);

  return result;
}

async function saveExcelWorkbook(
  outputPath: string,
  data: StructuredAgentOutput
): Promise<OutputWriteResult> {
  const result = prepareOutputPath(outputPath);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AI Agent";
  workbook.created = new Date();

  const reportSheet = workbook.addWorksheet("Report");

  reportSheet.columns = [
    { header: "Section", key: "section", width: 20 },
    { header: "Content", key: "content", width: 80 }
  ];

  reportSheet.addRow({
    section: "Title",
    content: data.title
  });

  reportSheet.addRow({
    section: "Response",
    content: data.summary
  });

  const nextSteps = data.nextSteps ?? [];

  if (nextSteps.length > 0) {
    nextSteps.forEach((step, index) => {
      reportSheet.addRow({
        section: `Next Step ${index + 1}`,
        content: step
      });
    });
  } else {
    reportSheet.addRow({
      section: "Next Steps",
      content: "No next steps provided."
    });
  }

  reportSheet.getRow(1).font = { bold: true };
  reportSheet.getColumn("content").alignment = { wrapText: true };

  if (data.tableRows && data.tableRows.length > 0) {
    const dataSheet = workbook.addWorksheet("Data");
    const headers = Object.keys(data.tableRows[0]);

    dataSheet.columns = headers.map(header => ({
      header,
      key: header,
      width: 25
    }));

    data.tableRows.forEach(row => {
      dataSheet.addRow(row);
    });

    dataSheet.getRow(1).font = { bold: true };
  }

  await workbook.xlsx.writeFile(result.outputPath);

  return result;
}

async function savePdfDocument(
  outputPath: string,
  data: StructuredAgentOutput
): Promise<OutputWriteResult> {
  const result = prepareOutputPath(outputPath);

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 50
    });

    const stream = fs.createWriteStream(result.outputPath);

    stream.on("finish", resolve);
    stream.on("error", reject);
    doc.on("error", reject);

    doc.pipe(stream);

    doc.fontSize(20).text(data.title);
    doc.moveDown();

    doc.fontSize(14).text("Response");
    doc.moveDown(0.5);

    doc.fontSize(11).text(data.summary, {
      align: "left"
    });

    doc.moveDown();

    doc.fontSize(14).text("Next Steps");
    doc.moveDown(0.5);

    const nextSteps = data.nextSteps ?? [];

    if (nextSteps.length > 0) {
      nextSteps.forEach((step, index) => {
        doc.fontSize(11).text(`${index + 1}. ${step}`);
      });
    } else {
      doc.fontSize(11).text("No next steps provided.");
    }

    doc.end();
  });

  return result;
}

function saveJupyterNotebook(
  outputPath: string,
  data: StructuredAgentOutput
): OutputWriteResult {
  const notebook = {
    cells: [
      {
        cell_type: "markdown",
        metadata: {},
        source: [
          `# ${data.title}\n`,
          "\n",
          "## Response\n",
          "\n",
          `${data.summary}\n`,
          "\n",
          "## Next Steps\n",
          "\n",
          ...(data.nextSteps && data.nextSteps.length > 0
            ? data.nextSteps.map((step, index) => `${index + 1}. ${step}\n`)
            : ["No next steps provided.\n"])
        ]
      },
      {
        cell_type: "code",
        execution_count: null,
        metadata: {},
        outputs: [],
        source: data.notebookCode
          ? data.notebookCode.split("\n").map(line => `${line}\n`)
          : ["# Add your analysis code here\n"]
      }
    ],
    metadata: {
      kernelspec: {
        display_name: "Python 3",
        language: "python",
        name: "python3"
      },
      language_info: {
        name: "python",
        version: "3.x"
      }
    },
    nbformat: 4,
    nbformat_minor: 5
  };

  return saveAgentOutput(outputPath, JSON.stringify(notebook, null, 2));
}
