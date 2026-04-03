export function calculateHealthStatus(qty: number, threshold?: number): 'CRITICAL' | 'WARNING' | 'HEALTHY' {
    const criticalLevel = process.env.CRITICAL_STOCK_LEVEL ? parseInt(process.env.CRITICAL_STOCK_LEVEL, 10) : 0;
    const warningLevel = threshold ?? (process.env.WARNING_STOCK_LEVEL ? parseInt(process.env.WARNING_STOCK_LEVEL, 10) : 5);
    
    if (qty <= criticalLevel) return 'CRITICAL';
    if (qty < warningLevel) return 'WARNING';
    return 'HEALTHY';
}
