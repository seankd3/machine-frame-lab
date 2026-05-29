import { Check, Download, Link } from "lucide-react";
import { useState } from "react";
import { createShareUrl, downloadSharedDesign, type SharedDesign } from "../model/share";

interface ShareActionsProps {
  design: SharedDesign;
}

export function ShareActions({ design }: ShareActionsProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "ready">("idle");
  const [shareUrl, setShareUrl] = useState("");

  const copyLink = async () => {
    const url = createShareUrl(design);
    setShareUrl(url);
    const didCopy = await copyText(url);
    setStatus(didCopy ? "copied" : "ready");
    window.setTimeout(() => setStatus("idle"), didCopy ? 1600 : 4200);
  };

  return (
    <div className="share-actions" aria-label="Share design">
      <button className="status-pill share-button" type="button" onClick={copyLink}>
        {status === "copied" ? <Check size={16} /> : <Link size={16} />}
        <span>{status === "copied" ? "Copied" : status === "ready" ? "Link ready" : "Copy link"}</span>
      </button>
      <button
        className="status-pill share-button icon-only"
        type="button"
        title="Download design JSON"
        onClick={() => downloadSharedDesign(design)}
      >
        <Download size={16} />
      </button>
      {status === "ready" ? (
        <input
          className="share-link-readout"
          value={shareUrl}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
          aria-label="Share link"
        />
      ) : null}
    </div>
  );
}

async function copyText(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the selection fallback for plain HTTP preview URLs.
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textArea);
  }
}
