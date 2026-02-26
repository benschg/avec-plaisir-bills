import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { file, fileName, apiKey } = await request.json();

    if (!file || !apiKey) {
      return NextResponse.json(
        { success: false, error: "Missing file data or API key" },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = `You are an expert invoice data extraction system. Analyze this PDF invoice and extract all structured data.

Return a JSON object with EXACTLY this structure:
{
  "vendor": {
    "name": "string - vendor/supplier company name",
    "address": "string - full vendor address",
    "tax_id": "string - VAT/tax identification number (optional)",
    "email": "string - vendor email (optional)",
    "phone": "string - vendor phone (optional)"
  },
  "customer": {
    "name": "string - customer/buyer name",
    "address": "string - full customer address",
    "tax_id": "string - customer VAT/tax ID (optional)"
  },
  "invoice_number": "string - invoice number/reference",
  "invoice_date": "string - invoice date in YYYY-MM-DD format",
  "due_date": "string - payment due date in YYYY-MM-DD format (optional)",
  "currency": "string - currency code (EUR, USD, CHF, etc.)",
  "line_items": [
    {
      "position": "number - line item position (optional)",
      "description": "string - product/service description",
      "quantity": "number",
      "unit_price": "number - price per unit",
      "tax_rate": "number - tax percentage e.g. 19 for 19% (optional)",
      "line_total": "number - total for this line",
      "image_search_query": "string - optimized Google Image search query to find this product (max 8 words, include brand if known, strip invoice jargon)"
    }
  ],
  "subtotal": "number - subtotal before tax",
  "tax_amount": "number - total tax amount",
  "total": "number - grand total including tax",
  "payment_info": {
    "iban": "string (optional)",
    "swift": "string (optional)",
    "bank_name": "string (optional)",
    "terms": "string - payment terms (optional)"
  },
  "notes": "string - any additional notes (optional)"
}

Important rules:
- Extract ALL line items from the invoice table
- Convert all dates to YYYY-MM-DD format
- Use the original currency values (do not convert)
- Omit optional fields that are not present in the invoice
- For tax rates, use the percentage number (e.g., 19 for 19%)
- Ensure numerical values are numbers, not strings
- The invoice may be in German, French, English, or other languages — extract data regardless of language

File: ${fileName}`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "application/pdf",
          data: file,
        },
      },
    ]);

    const response = result.response;
    const text = response.text();
    const data = JSON.parse(text);

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Extraction error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
