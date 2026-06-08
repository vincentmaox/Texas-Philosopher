import type { RunState, MapNode, MapNodeType, AscensionLevel } from '@/types/progression';
import { createNewRun, getAvailableNodes, completeNode, isRunComplete, isRunDead } from '@/progression/map-generator';
import { getBossForNode } from '@/progression/boss-encounters';
import { PHILOSOPHY_TOOLS, getTool } from '@/progression/philosophy-tools';
import { ascensionLabel } from '@/progression/ascension';
import { PALETTE } from '@/ui/theme/palette';

type MapCallback = (node: MapNode, run: RunState) => void;

export class MapScreen {
  private container: HTMLElement;
  private run: RunState | null = null;
  private onNodeSelect: MapCallback | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  setOnNodeSelect(cb: MapCallback): void {
    this.onNodeSelect = cb;
  }

  startRun(ascension: AscensionLevel): void {
    this.run = createNewRun(ascension);
    this.render();
  }

  loadRun(run: RunState): void {
    this.run = run;
    this.render();
  }

  getRun(): RunState | null {
    return this.run;
  }

  private render(): void {
    if (!this.run) return;
    const run = this.run;

    this.container.innerHTML = '';
    this.container.style.position = 'relative';
    this.container.style.overflowY = 'auto';

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px 20px; background: ${PALETTE.bgCard};
      border-bottom: 1px solid ${PALETTE.bgElevated};
    `;
    header.innerHTML = `
      <div>
        <div style="font-size: 16px; font-weight: 700; color: ${PALETTE.textPrimary};">
          ${ascensionLabel(run.ascension)}
        </div>
        <div style="font-size: 12px; color: ${PALETTE.textSecondary}; margin-top: 2px;">
          第${run.floor}层 · 筹码 ${run.pool}
        </div>
      </div>
      <div style="display: flex; gap: 12px; align-items: center;">
        <div style="font-size: 13px; color: ${PALETTE.textSecondary};">
          工具 ${run.tools.length}/${run.toolSlots}
        </div>
      </div>
    `;
    this.container.appendChild(header);

    // Tool bar
    if (run.tools.length > 0) {
      const toolBar = document.createElement('div');
      toolBar.style.cssText = `
        display: flex; gap: 8px; padding: 8px 20px;
        background: ${PALETTE.bgMid}; flex-wrap: wrap;
      `;
      for (const toolId of run.tools) {
        const tool = getTool(toolId);
        const chip = document.createElement('span');
        chip.style.cssText = `
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 10px; border-radius: 6px; font-size: 12px;
          background: ${PALETTE.bgCard}; border: 1px solid ${PALETTE.bgElevated};
          color: ${PALETTE.textPrimary};
        `;
        chip.textContent = `${tool.icon} ${tool.name}`;
        chip.title = tool.description;
        toolBar.appendChild(chip);
      }
      this.container.appendChild(toolBar);
    }

    // Floors
    const available = getAvailableNodes(run);
    const availableIds = new Set(available.map(n => n.id));

    for (const floor of run.floors) {
      const floorDiv = document.createElement('div');
      floorDiv.style.cssText = `
        padding: 16px 20px;
        border-bottom: 1px solid ${PALETTE.bgElevated};
      `;

      const floorLabel = document.createElement('div');
      floorLabel.style.cssText = `
        font-size: 11px; color: ${PALETTE.textDim}; margin-bottom: 8px;
        text-transform: uppercase; letter-spacing: 1px;
      `;
      floorLabel.textContent = `第 ${floor.floor} 层`;
      floorDiv.appendChild(floorLabel);

      const nodesDiv = document.createElement('div');
      nodesDiv.style.cssText = `display: flex; gap: 12px; flex-wrap: wrap;`;

      for (const node of floor.nodes) {
        const isCompleted = run.completedNodeIds.includes(node.id);
        const isAvailable = availableIds.has(node.id);
        const nodeEl = createNodeCard(node, isCompleted, isAvailable);

        if (isAvailable && !isCompleted) {
          nodeEl.style.cursor = 'pointer';
          nodeEl.addEventListener('click', () => {
            if (this.onNodeSelect) {
              this.onNodeSelect(node, run);
            }
          });
          nodeEl.addEventListener('mouseenter', () => {
            nodeEl.style.transform = 'translateY(-2px)';
            nodeEl.style.boxShadow = `0 4px 12px rgba(0,0,0,0.3)`;
          });
          nodeEl.addEventListener('mouseleave', () => {
            nodeEl.style.transform = '';
            nodeEl.style.boxShadow = '';
          });
        }

        nodesDiv.appendChild(nodeEl);
      }

      floorDiv.appendChild(nodesDiv);
      this.container.appendChild(floorDiv);
    }

    // Run status
    if (isRunComplete(run)) {
      this.showRunEnd(true);
    } else if (isRunDead(run)) {
      this.showRunEnd(false);
    }
  }

  private showRunEnd(victory: boolean): void {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.8); display: flex; flex-direction: column;
      align-items: center; justify-content: center; z-index: 20;
    `;

    const title = document.createElement('div');
    title.style.cssText = `
      font-size: 32px; font-weight: 800; margin-bottom: 12px;
      color: ${victory ? PALETTE.achievement : PALETTE.bad};
    `;
    title.textContent = victory ? '通关！' : '破产...';
    overlay.appendChild(title);

    const subtitle = document.createElement('div');
    subtitle.style.cssText = `
      font-size: 14px; color: ${PALETTE.textSecondary}; margin-bottom: 24px;
    `;
    subtitle.textContent = victory
      ? `最终筹码: ${this.run?.pool || 0}`
      : `到达第${this.run?.floor || 1}层后破产`;
    overlay.appendChild(subtitle);

    const retryBtn = document.createElement('button');
    retryBtn.textContent = '重新开始';
    retryBtn.style.cssText = `
      padding: 12px 32px; border-radius: 10px; border: 2px solid ${PALETTE.achievement};
      background: ${PALETTE.achievement}22; color: ${PALETTE.achievement};
      font-weight: bold; font-size: 16px; cursor: pointer;
    `;
    retryBtn.addEventListener('click', () => {
      overlay.remove();
      if (this.run) {
        this.startRun(this.run.ascension);
      }
    });
    overlay.appendChild(retryBtn);

    this.container.appendChild(overlay);
  }
}

function createNodeCard(node: MapNode, completed: boolean, available: boolean): HTMLElement {
  const el = document.createElement('div');
  const typeColors: Record<MapNodeType, string> = {
    fish_pond: PALETTE.correct,
    elite_pond: PALETTE.warning,
    boss: PALETTE.bad,
    harbor: PALETTE.info,
    treasure: PALETTE.achievement,
  };
  const color = typeColors[node.type];
  const opacity = completed ? '0.5' : available ? '1' : '0.3';

  el.style.cssText = `
    padding: 12px 16px; border-radius: 10px;
    background: ${PALETTE.bgCard}; border: 1px solid ${color}44;
    border-left: 3px solid ${color};
    opacity: ${opacity};
    transition: transform 0.15s, box-shadow 0.15s;
    min-width: 140px; max-width: 200px;
  `;

  const typeIcons: Record<MapNodeType, string> = {
    fish_pond: '🐟',
    elite_pond: '🦈',
    boss: '👹',
    harbor: '⚓',
    treasure: '💎',
  };

  el.innerHTML = `
    <div style="font-size: 13px; font-weight: 600; color: ${color};">
      ${typeIcons[node.type]} ${node.label}
    </div>
    <div style="font-size: 11px; color: ${PALETTE.textDim}; margin-top: 4px;">
      ${node.description}
    </div>
    ${node.buyIn > 0 ? `<div style="font-size: 11px; color: ${PALETTE.textSecondary}; margin-top: 4px;">买入: ${node.buyIn}</div>` : ''}
    ${completed ? '<div style="font-size: 11px; color: ' + PALETTE.correct + '; margin-top: 4px;">已完成</div>' : ''}
  `;

  return el;
}
