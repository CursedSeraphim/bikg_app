import { useCallback, useEffect } from 'react';

interface UseLabelSanitizerParams {
  hiddenLabels: string[];
  cyDataNodes: any[];
}

export function useCanvasAnonymizer() {
  useEffect(() => {
    const proto = CanvasRenderingContext2D.prototype as any;
    if (proto.__biAnonymizePatched) return;

    const re = /boehringer/gi;
    const sanitize = (t: unknown) => String(t ?? '').replace(re, 'anonymized');

    const origFill = proto.fillText;
    const origStroke = proto.strokeText;
    const origMeasure = proto.measureText;

    proto.fillText = function (text: any, x: number, y: number, maxWidth?: number) {
      const s = sanitize(text);
      return maxWidth !== undefined ? origFill.call(this, s, x, y, maxWidth) : origFill.call(this, s, x, y);
    };
    proto.strokeText = function (text: any, x: number, y: number, maxWidth?: number) {
      const s = sanitize(text);
      return maxWidth !== undefined ? origStroke.call(this, s, x, y, maxWidth) : origStroke.call(this, s, x, y);
    };
    proto.measureText = function (text: any) {
      const s = sanitize(text);
      return origMeasure.call(this, s);
    };

    proto.__biAnonymizePatched = true;
  }, []);
}

export function useLabelSanitizer({ hiddenLabels, cyDataNodes }: UseLabelSanitizerParams) {
  const stripDecorations = useCallback((label: string | undefined) => {
    if (!label) return '';
    return label.replace(/\s*\([^)]*\)\s*$/, '').replace(/\*$/, '');
  }, []);

  const anonymizeLabel = useCallback((value: string | undefined): string => {
    if (!value) return '';
    return value.replace(/boehringer/gi, 'anonymized');
  }, []);

  const isLabelBlacklisted = useCallback(
    (label: string | undefined) => {
      if (!hiddenLabels || hiddenLabels.length === 0) return false;
      const base = stripDecorations(label);
      return hiddenLabels.includes(base);
    },
    [hiddenLabels, stripDecorations],
  );

  const isIdBlacklisted = useCallback(
    (id: string) => {
      const n = cyDataNodes.find((x) => x.data.id === id);
      return (n ? isLabelBlacklisted(n.data.label) : false) || hiddenLabels.includes(id);
    },
    [cyDataNodes, hiddenLabels, isLabelBlacklisted],
  );

  return { anonymizeLabel, isIdBlacklisted, isLabelBlacklisted, stripDecorations };
}
