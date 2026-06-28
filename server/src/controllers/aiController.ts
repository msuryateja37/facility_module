import { Request, Response } from 'express';

export const chatMessage = (req: Request, res: Response) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ message: "Message is required" });
  }

  const prompt = message.toLowerCase();
  let reply = "I am the DLRRD Facilities Verification Assistant. I can help you review compliance checklists, verify safety protocols, or guide you through the 7-step Finance Payment Form. Could you please specify your question?";

  if (prompt.includes("compliance") || prompt.includes("checklist")) {
    reply = "According to DLRRD regulation D-310: Facilities require (1) Occupancy permits, (2) Certified fire safety clearances, (3) Structural inspections, and (4) ADA accessibility compliance. Please make sure the Admin Clerk uploads these documents before verification.";
  } else if (prompt.includes("payment") || prompt.includes("finance") || prompt.includes("invoice")) {
    reply = "To authorize a facility payment, the Financial Department must complete the 7-page Payment Form. This includes capturing invoice details (Page 1-2), banking verification (Page 3), budget allocation (Page 4), internal control checklist (Page 5), digital signatures (Page 6), and supporting documents validation (Page 7).";
  } else if (prompt.includes("role") || prompt.includes("workflow")) {
    reply = "The standard workflow is: (1) Clerk creates review, (2) Supervisor verifies checklist & uploads files, (3) Deputy Director reviews, (4) Director gives final sign-off, (5) Internal Control registers archival, and (6) Finance processes payments.";
  } else if (prompt.includes("status") || prompt.includes("state")) {
    reply = "You can view the current review queue states in the Verification tab. Reviews in 'Pending Verification' must be updated to 'Verified' by uploading the inspection reports.";
  }

  return res.status(200).json({ reply });
};
