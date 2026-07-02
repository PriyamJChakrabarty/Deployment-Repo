import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    const { email, transcript, complianceFlags, actionItems } =
      await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Generate HTML email content
    const htmlContent = generateEmailHTML(
      transcript,
      complianceFlags,
      actionItems
    );

    // Send email using Resend
    const data = await resend.emails.send({
      from: "Zudia+ <onboarding@resend.dev>", // Replace with your verified domain
      to: [email],
      subject: "Meeting Analysis Report - Zudia+",
      html: htmlContent,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "Failed to send email", details: error.message },
      { status: 500 }
    );
  }
}

function generateEmailHTML(transcript, complianceFlags, actionItems) {
  const complianceFlagsHTML =
    complianceFlags && complianceFlags.length > 0
      ? complianceFlags
          .map(
            (item) => `
        <div style="border-left: 4px solid ${getRiskColor(
          item["Risk Level"] || item.RiskLevel
        )}; padding: 15px; margin-bottom: 15px; background-color: #f9fafb; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="background-color: ${getRiskBgColor(
              item["Risk Level"] || item.RiskLevel
            )}; color: ${getRiskColor(
              item["Risk Level"] || item.RiskLevel
            )}; padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase;">
              ${item["Risk Level"] || item.RiskLevel || "N/A"}
            </span>
            ${
              item.Deadline || item.deadline
                ? `<span style="color: #6b7280; font-size: 13px;">📅 ${
                    item.Deadline || item.deadline
                  }</span>`
                : ""
            }
          </div>
          <h4 style="margin: 10px 0; color: #111827; font-size: 16px;">📄 ${
            item.Clause || item.clause || "N/A"
          }</h4>
          ${
            item.Description || item.description
              ? `<p style="color: #4b5563; font-size: 14px; margin: 10px 0;">${
                  item.Description || item.description
                }</p>`
              : ""
          }
          ${
            item["Responsible Person"] || item.ResponsiblePerson
              ? `<p style="color: #4f46e5; font-size: 13px; margin-top: 10px;"><strong>👤 Assigned to:</strong> ${
                  item["Responsible Person"] || item.ResponsiblePerson
                }</p>`
              : ""
          }
        </div>
      `
          )
          .join("")
      : '<p style="color: #6b7280;">No compliance flags detected.</p>';

  const actionItemsHTML =
    actionItems && actionItems.length > 0
      ? actionItems
          .map(
            (item) => `
        <div style="border-left: 4px solid #6366f1; padding: 15px; margin-bottom: 15px; background-color: #f9fafb; border-radius: 8px;">
          <h4 style="margin: 0 0 10px 0; color: #111827; font-size: 16px;">✅ ${
            item.Action || item.action || "N/A"
          }</h4>
          ${
            item.Description || item.description
              ? `<p style="color: #4b5563; font-size: 14px; margin: 10px 0;">${
                  item.Description || item.description
                }</p>`
              : ""
          }
          <div style="display: flex; gap: 20px; margin-top: 10px;">
            ${
              item["Responsible Person"] || item.ResponsiblePerson
                ? `<span style="color: #4f46e5; font-size: 13px;"><strong>👤 Assigned:</strong> ${
                    item["Responsible Person"] || item.ResponsiblePerson
                  }</span>`
                : ""
            }
            ${
              item.Deadline || item.deadline
                ? `<span style="color: #6b7280; font-size: 13px;"><strong>📅 Due:</strong> ${
                    item.Deadline || item.deadline
                  }</span>`
                : ""
            }
          </div>
        </div>
      `
          )
          .join("")
      : '<p style="color: #6b7280;">No action items detected.</p>';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Meeting Analysis Report</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px;">
        <div style="max-width: 800px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">⚖️ Zudia+</h1>
            <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">Meeting Analysis Report</p>
          </div>

          <!-- Content -->
          <div style="padding: 30px;">

            <!-- Compliance Flags Section -->
            <div style="margin-bottom: 30px;">
              <h2 style="color: #111827; font-size: 24px; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">🚨 Compliance Flags</h2>
              ${complianceFlagsHTML}
            </div>

            <!-- Action Items Section -->
            <div style="margin-bottom: 30px;">
              <h2 style="color: #111827; font-size: 24px; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">✅ Action Items</h2>
              ${actionItemsHTML}
            </div>

          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 13px;">
              © 2025 Zudia+ | Legal Compliance Tracker<br>
              This report was automatically generated from your meeting analysis.
            </p>
          </div>

        </div>
      </body>
    </html>
  `;
}

function getRiskColor(riskLevel) {
  const level = (riskLevel || "").toLowerCase();
  if (level.includes("high") || level.includes("critical")) return "#dc2626";
  if (level.includes("medium") || level.includes("warning")) return "#f59e0b";
  if (level.includes("low")) return "#10b981";
  return "#6b7280";
}

function getRiskBgColor(riskLevel) {
  const level = (riskLevel || "").toLowerCase();
  if (level.includes("high") || level.includes("critical")) return "#fee2e2";
  if (level.includes("medium") || level.includes("warning")) return "#fef3c7";
  if (level.includes("low")) return "#d1fae5";
  return "#f3f4f6";
}
