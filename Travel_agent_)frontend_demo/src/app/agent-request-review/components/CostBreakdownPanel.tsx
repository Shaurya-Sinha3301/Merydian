import Icon from '@/components/ui/AppIcon';

interface CostItem {
  category: string;
  original: number;
  modified: number;
  delta: number;
}

interface MarginData {
  totalCost: number;
  companyCut: number;
  agentCut: number;
  customerPrice: number;
  marginPercentage: number;
}

interface CostBreakdownPanelProps {
  costItems: CostItem[];
  originalMargin: MarginData;
  modifiedMargin: MarginData;
  hasModifications: boolean;
}

const CostBreakdownPanel = ({ 
  costItems, 
  originalMargin, 
  modifiedMargin,
  hasModifications 
}: CostBreakdownPanelProps) => {
  const getDeltaColor = (delta: number) => {
    if (delta > 0) return 'text-destructive';
    if (delta < 0) return 'text-success';
    return 'text-muted-foreground';
  };

  const getDeltaIcon = (delta: number) => {
    if (delta > 0) return 'ArrowUpIcon';
    if (delta < 0) return 'ArrowDownIcon';
    return 'MinusIcon';
  };

  return (
    <div className="bg-card rounded-lg border border-border p-4 space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center space-x-2">
        <Icon name="CurrencyDollarIcon" size={18} className="text-primary" variant="solid" />
        <span>Cost Breakdown & Margins</span>
      </h3>

      {/* Cost Items */}
      <div className="space-y-2">
        {costItems.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{item.category}</span>
            <div className="flex items-center space-x-3">
              <span className="data-text text-foreground">${item.original.toFixed(2)}</span>
              {hasModifications && (
                <>
                  <Icon name="ArrowRightIcon" size={14} className="text-muted-foreground" />
                  <span className="data-text text-foreground font-medium">${item.modified.toFixed(2)}</span>
                  <span className={`data-text text-xs flex items-center space-x-1 ${getDeltaColor(item.delta)}`}>
                    <Icon name={getDeltaIcon(item.delta) as any} size={12} />
                    <span>${Math.abs(item.delta).toFixed(2)}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border pt-3 space-y-3">
        {/* Original Margin */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Base Cost</span>
            <span className="data-text text-foreground">${originalMargin.totalCost.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Company Cut ({originalMargin.companyCut}%)</span>
            <span className="data-text text-foreground">${(originalMargin.totalCost * originalMargin.companyCut / 100).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Agent Cut ({originalMargin.agentCut}%)</span>
            <span className="data-text text-foreground">${(originalMargin.totalCost * originalMargin.agentCut / 100).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm font-semibold pt-2 border-t border-border">
            <span className="text-foreground">Customer Price</span>
            <span className="data-text text-foreground">${originalMargin.customerPrice.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Margin</span>
            <span className="data-text text-success">{originalMargin.marginPercentage.toFixed(1)}%</span>
          </div>
        </div>

        {/* Modified Margin */}
        {hasModifications && (
          <div className="space-y-2 pt-3 border-t border-border">
            <div className="flex items-center space-x-2 mb-2">
              <Icon name="ArrowPathIcon" size={16} className="text-accent" />
              <span className="text-sm font-medium text-accent">Modified Pricing</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Base Cost</span>
              <span className="data-text text-foreground font-medium">${modifiedMargin.totalCost.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Company Cut ({modifiedMargin.companyCut}%)</span>
              <span className="data-text text-foreground">${(modifiedMargin.totalCost * modifiedMargin.companyCut / 100).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Agent Cut ({modifiedMargin.agentCut}%)</span>
              <span className="data-text text-foreground">${(modifiedMargin.totalCost * modifiedMargin.agentCut / 100).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm font-semibold pt-2 border-t border-border">
              <span className="text-foreground">Customer Price</span>
              <div className="flex items-center space-x-2">
                <span className="data-text text-foreground">${modifiedMargin.customerPrice.toFixed(2)}</span>
                <span className={`data-text text-xs flex items-center space-x-1 ${getDeltaColor(modifiedMargin.customerPrice - originalMargin.customerPrice)}`}>
                  <Icon name={getDeltaIcon(modifiedMargin.customerPrice - originalMargin.customerPrice) as any} size={12} />
                  <span>${Math.abs(modifiedMargin.customerPrice - originalMargin.customerPrice).toFixed(2)}</span>
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Margin</span>
              <div className="flex items-center space-x-2">
                <span className={`data-text ${modifiedMargin.marginPercentage >= originalMargin.marginPercentage ? 'text-success' : 'text-destructive'}`}>
                  {modifiedMargin.marginPercentage.toFixed(1)}%
                </span>
                <span className={`data-text text-xs ${getDeltaColor(modifiedMargin.marginPercentage - originalMargin.marginPercentage)}`}>
                  ({modifiedMargin.marginPercentage > originalMargin.marginPercentage ? '+' : ''}{(modifiedMargin.marginPercentage - originalMargin.marginPercentage).toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CostBreakdownPanel;