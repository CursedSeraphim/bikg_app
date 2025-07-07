import type { Column, IDataRow, IOrderedGroup, ISetColumn } from 'lineupjs';
import { isCategoricalColumn, isSetColumn } from 'lineupjs';
import { CANVAS_HEIGHT, cssClass, UPSET } from 'lineupjs/build/src/styles';
import type { ICellRendererFactory, IRenderContext, ISummaryRenderer, IGroupCellRenderer, ICellRenderer } from 'lineupjs/build/src/renderer/interfaces';
import { renderMissingCanvas, renderMissingDOM } from 'lineupjs/build/src/renderer/missing';

export default class ColoredUpSetCellRenderer implements ICellRendererFactory {
  readonly title = 'ColoredUpSet';

  canRender(col: Column) {
    return isSetColumn(col);
  }

  private static calculateSetPath(setData: boolean[], cellDimension: number) {
    const catindexes: number[] = [];
    setData.forEach((d, i) => (d ? catindexes.push(i) : -1));
    const left = catindexes[0] * cellDimension + cellDimension / 2;
    const right = catindexes[catindexes.length - 1] * cellDimension + cellDimension / 2;
    return { left, right };
  }

  private static createDOMContext(col: ISetColumn, sanitize: (v: string) => string) {
    const { categories } = col;
    let templateRows = '';
    for (const cat of categories) {
      templateRows += `<div class="${cssClass('upset-dot')}" title="${sanitize(cat.label)}"></div>`;
    }
    return {
      template: `<div class="${cssClass('upset')}"><div class="${cssClass('upset-line')}"></div>${templateRows}</div>`,
      render: (n: HTMLElement, value: boolean[]) => {
        const cats = col.categories;
        const isOverview = Boolean(n.closest(`.${cssClass('low')}`));
        Array.from(n.children)
          .slice(1)
          .forEach((d, i) => {
            const v = value[i];
            d.classList.toggle(cssClass('enabled'), v);
            if (isOverview) {
              (d as HTMLElement).style.backgroundColor = cats[i]?.color ?? UPSET.color;
              (d as HTMLElement).style.opacity = v ? '1' : String(UPSET.inactive);
            } else {
              (d as HTMLElement).style.backgroundColor = '';
              (d as HTMLElement).style.opacity = '';
            }
          });

        const line = n.firstElementChild as HTMLElement;
        const left = value.findIndex((d) => d);
        const right =
          value.length -
          1 -
          value
            .slice()
            .reverse()
            .findIndex((d) => d);

        if (left < 0 || left === right) {
          line.style.display = 'none';
          return;
        }
        line.style.display = '';
        line.style.left = `${Math.round((100 * (left + 0.5)) / value.length)}%`;
        line.style.width = `${Math.round((100 * (right - left)) / value.length)}%`;
        line.style.backgroundColor = isOverview ? UPSET.color : '';
      },
    };
  }

  create(col: ISetColumn, context: IRenderContext): ICellRenderer {
    const { template, render } = ColoredUpSetCellRenderer.createDOMContext(col, context.sanitize);
    const width = context.colWidth(col);
    const cellDimension = width / col.categories.length;

    return {
      template,
      update: (n: HTMLElement, d: IDataRow) => {
        if (renderMissingDOM(n, col, d)) {
          return;
        }
        render(n, col.getValues(d));
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow) => {
        if (renderMissingCanvas(ctx, col, d, width)) {
          return;
        }
        const data = col.getValues(d);
        const hasTrueValues = data.some((v) => v);
        const isOverview = Boolean(ctx.canvas.closest(`.${cssClass('low')}`));

        ctx.save();
        ctx.strokeStyle = UPSET.color;
        if (hasTrueValues) {
          const { left, right } = ColoredUpSetCellRenderer.calculateSetPath(data, cellDimension);
          ctx.beginPath();
          ctx.moveTo(left, CANVAS_HEIGHT / 2);
          ctx.lineTo(right, CANVAS_HEIGHT / 2);
          ctx.stroke();
        }

        const cats = col.categories;
        data.forEach((val, j) => {
          const posX = j * cellDimension;
          ctx.fillStyle = isOverview ? cats[j]?.color ?? UPSET.color : UPSET.color;
          ctx.globalAlpha = val ? 1 : UPSET.inactive;
          ctx.fillRect(posX, 0, cellDimension, CANVAS_HEIGHT);
        });

        ctx.restore();
      },
    };
  }

  createGroup(col: ISetColumn, context: IRenderContext): IGroupCellRenderer {
    const { template, render } = ColoredUpSetCellRenderer.createDOMContext(col, context.sanitize);
    return {
      template,
      update: (n: HTMLElement, group: IOrderedGroup) => {
        return context.tasks.groupCategoricalStats(col, group).then((r) => {
          if (typeof r === 'symbol') {
            return;
          }
          render(
            n,
            r.group.hist.map((d) => d.count > 0),
          );
        });
      },
    };
  }

  createSummary(col: ISetColumn, context: IRenderContext): ISummaryRenderer {
    const { template, render } = ColoredUpSetCellRenderer.createDOMContext(col, context.sanitize);
    return {
      template,
      update: (n: HTMLElement) => {
        return context.tasks.summaryCategoricalStats(col).then((r) => {
          if (typeof r === 'symbol') {
            return;
          }
          render(
            n,
            r.summary.hist.map((d) => d.count > 0),
          );
        });
      },
    };
  }
}
