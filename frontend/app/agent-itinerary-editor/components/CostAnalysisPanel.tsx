'use client';

import Icon from '@/components/ui/AppIcon';

interface CostBreakdown {
  category: string;
  original: number;
  modified: number;
  change: number;
  icon: string;
}

interface MarginAnalysis {
  totalCost: number;
  customerPrice: number;
  grossMargin: number;
  companyCut: number;
  agentCut: number;
  marginPercentage: number;
}

interface CostAnalysisPanelProps {
  originalCost: number;
  modifiedCost: number;
  breakdown: CostBreakdown[];
  marginAnalysis: MarginAnalysis;
  isExpanded?: boolean;
}

const CostAnalysisPanel = ({
  originalCost,
  modifiedCost,
  breakdown,
  marginAnalysis,
  isExpanded = true,
}: CostAnalysisPanelProps) => {
  const costDelta = modifiedCost - originalCost;
  const costDeltaPercentage = ((costDelta / originalCost) * 100).toFixed(1);
  const isIncrease = costDelta > 0;

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-foreground">Cost Analysis</h3>
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-md ${
            isIncrease ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'
          }`}>
            <Icon name={isIncrease ? 'ArrowTrendingUpIcon' : 'ArrowTrendingDownIcon'} size={16} variant="solid" />
            <span className="text-sm font-semibold">
              {isIncrease ? '+' : ''}{costDeltaPercentage}%
            </span>
          </div>
        </div>

        {/* Cost Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Original</p>
            <p className="text-lg font-semibold text-foreground data-text">${originalCost.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Modified</p>
            <p className="text-lg font-semibold text-primary data-text">${modifiedCost.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Change</p>
            <p className={`text-lg font-semibold data-text ${
              isIncrease ? 'text-destructive' : 'text-success'
            }`}>
              {isIncrease ? '+' : ''}${Math.abs(costDelta).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Cost Breakdown */}
          <div className="p-4 border-b border-border">
            <h4 className="text-sm font-semibold text-foreground mb-3">Cost Breakdown</h4>
            <div className="space-y-3">
              {breakdown.map((item, index) => {
                const itemChange = item.modified - item.original;
                const hasChange = itemChange !== 0;

                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Icon name={item.icon as any} size={16} className="text-muted-foreground" />
                      <span className="text-sm text-foreground">{item.category}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-muted-foreground line-through data-text">
                        ${item.original.toLocaleString()}
                      </span>
                      <span className="text-sm font-medium text-foreground data-text">
                        ${item.modified.toLocaleString()}
                      </span>
                      {hasChange && (
                        <span className={`text-xs font-medium data-text ${
                          itemChange > 0 ? 'text-destructive' : 'text-success'
                        }`}>
                          {itemChange > 0 ? '+' : ''}${Math.abs(itemChange).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Margin Analysis */}
          <div className="p-4 bg-muted/20">
            <h4 className="text-sm font-semibold text-foreground mb-3">Margin Analysis</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Cost</span>
                <span className="text-sm font-medium text-foreground data-text">
                  ${marginAnalysis.totalCost.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Customer Price</span>
                <span className="text-sm font-medium text-foreground data-text">
                  ${marginAnalysis.customerPrice.toLocaleString()}
                </span>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Gross Margin</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-success data-text">
                    ${marginAnalysis.grossMargin.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({marginAnalysis.marginPercentage}%)
                  </span>
                </div>
              </div>
              <div className="pl-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Company Cut (70%)</span>
                  <span className="text-xs font-medium text-foreground data-text">
                    ${marginAnalysis.companyCut.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Agent Cut (30%)</span>
                  <span className="text-xs font-medium text-primary data-text">
                    ${marginAnalysis.agentCut.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Profitability Indicator */}
            <div className={`mt-4 p-3 rounded-md ${
              marginAnalysis.marginPercentage >= 20
                ? 'bg-success/10 border border-success/20'
                : marginAnalysis.marginPercentage >= 15
                ? 'bg-warning/10 border border-warning/20' :'bg-destructive/10 border border-destructive/20'
            }`}>
              <div className="flex items-center space-x-2">
                <Icon
                  name={
                    marginAnalysis.marginPercentage >= 20
                      ? 'CheckCircleIcon'
                      : marginAnalysis.marginPercentage >= 15
                      ? 'ExclamationTriangleIcon' :'XCircleIcon'
                  }
                  size={16}
                  className={
                    marginAnalysis.marginPercentage >= 20
                      ? 'text-success'
                      : marginAnalysis.marginPercentage >= 15
                      ? 'text-warning' :'text-destructive'
                  }
                  variant="solid"
                />
                <span className={`text-xs font-medium ${
                  marginAnalysis.marginPercentage >= 20
                    ? 'text-success'
                    : marginAnalysis.marginPercentage >= 15
                    ? 'text-warning' :'text-destructive'
                }`}>
                  {marginAnalysis.marginPercentage >= 20
                    ? 'Excellent Profitability'
                    : marginAnalysis.marginPercentage >= 15
                    ? 'Acceptable Margin' :'Low Margin Warning'}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CostAnalysisPanel;