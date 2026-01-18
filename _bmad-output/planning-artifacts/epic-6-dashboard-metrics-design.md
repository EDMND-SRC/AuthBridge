# Epic 6: Dashboard Metrics Design

**Document Version:** 1.0
**Created:** 2026-01-18
**Owner:** Alice (Product Owner)
**Status:** Complete
**Estimated Effort:** 1 day

---

## Overview

This document defines the dashboard metrics for Epic 6 (Reporting & Analytics), including data sources, calculations, and UI specifications.

---

## Story 6.1: Dashboard Metrics Overview

### Key Metrics (Top Cards)

#### 1. Total Verifications
**Description:** Count of verification cases created in the selected time period.

**Data Source:** DynamoDB `CASE#` entities

**Query:**
```typescript
// Query by date range using GSI2 (creation date index)
const params = {
  TableName: 'AuthBridgeTable',
  IndexName: 'GSI2',
  KeyConditionExpression: 'GSI2PK = :type AND GSI2SK BETWEEN :start AND :end',
  ExpressionAttributeValues: {
    ':type': 'CASE',
    ':start': '2026-01-01',
    ':end': '2026-01-31'
  }
};
```

**Calculation:**
- Today: Count of cases created today
- Week: Count of cases created in last 7 days
- Month: Count of cases created in last 30 days

**Trend Indicator:**
- Compare to previous period (yesterday, last week, last month)
- Show percentage change: `((current - previous) / previous) * 100`
- Green arrow up if positive, red arrow down if negative

**UI Component:**
```tsx
<MetricCard
  title="Total Verifications"
  value={1234}
  period="This Month"
  trend={{ value: 12.5, direction: 'up' }}
  icon={<DocumentIcon />}
/>
```

---

#### 2. Approval Rate
**Description:** Percentage of cases approved vs total completed cases.

**Data Source:** DynamoDB `CASE#` entities with status `approved` or `rejected`

**Calculation:**
```typescript
const approvalRate = (approvedCount / (approvedCount + rejectedCount)) * 100;
```

**Query:**
```typescript
// Query approved cases
const approved = await queryByStatus('approved', startDate, endDate);
// Query rejected cases
const rejected = await queryByStatus('rejected', startDate, endDate);
```

**Trend Indicator:**
- Compare to previous period
- Green if approval rate increased, red if decreased

**Target:** >90% approval rate (industry standard)

---

#### 3. Average Processing Time
**Description:** Average time from case creation to approval/rejection.

**Data Source:** DynamoDB `CASE#` entities with `createdAt` and `completedAt` timestamps

**Calculation:**
```typescript
const processingTimes = cases.map(c =>
  new Date(c.completedAt).getTime() - new Date(c.createdAt).getTime()
);
const avgProcessingTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
```

**Display Format:**
- < 1 hour: "X minutes"
- 1-24 hours: "X hours"
- > 24 hours: "X days"

**Trend Indicator:**
- Compare to previous period
- Green if processing time decreased, red if increased

**Target:** <2 hours (per PRD)

---

#### 4. Pending Cases
**Description:** Count of cases awaiting review.

**Data Source:** DynamoDB `CASE#` entities with status `pending_review` or `in_review`

**Query:**
```typescript
// Query by status using GSI1
const params = {
  TableName: 'AuthBridgeTable',
  IndexName: 'GSI1',
  KeyConditionExpression: 'GSI1PK = :client AND GSI1SK = :status',
  ExpressionAttributeValues: {
    ':client': 'CLIENT#all',
    ':status': 'STATUS#pending_review'
  }
};
```

**Real-time Update:**
- Poll every 30 seconds
- Show notification badge if count increases

**UI Component:**
```tsx
<MetricCard
  title="Pending Cases"
  value={42}
  subtitle="Awaiting Review"
  alert={pendingCount > 50 ? 'High queue volume' : null}
  icon={<ClockIcon />}
/>
```

---

### Charts & Visualizations

#### 1. Verification Volume Chart (Line Chart)
**Description:** Daily verification count over time.

**Data Source:** DynamoDB aggregated by date

**Query:**
```typescript
// Group by date
const volumeByDate = cases.reduce((acc, c) => {
  const date = c.createdAt.split('T')[0];
  acc[date] = (acc[date] || 0) + 1;
  return acc;
}, {});
```

**Chart Configuration:**
```tsx
<LineChart
  data={volumeByDate}
  xAxis="date"
  yAxis="count"
  color="#75AADB"
  showGrid={true}
  showTooltip={true}
/>
```

**Time Ranges:**
- Last 7 days (daily)
- Last 30 days (daily)
- Last 12 months (monthly)

---

#### 2. Status Distribution (Pie Chart)
**Description:** Breakdown of cases by status.

**Data Source:** DynamoDB `CASE#` entities grouped by status

**Query:**
```typescript
const statusCounts = cases.reduce((acc, c) => {
  acc[c.status] = (acc[c.status] || 0) + 1;
  return acc;
}, {});
```

**Chart Configuration:**
```tsx
<PieChart
  data={[
    { label: 'Approved', value: 850, color: '#10B981' },
    { label: 'Rejected', value: 120, color: '#EF4444' },
    { label: 'Pending', value: 42, color: '#F59E0B' },
    { label: 'In Review', value: 18, color: '#3B82F6' }
  ]}
  showLegend={true}
  showPercentages={true}
/>
```

---

#### 3. Document Type Distribution (Bar Chart)
**Description:** Count of verifications by document type.

**Data Source:** DynamoDB `CASE#` entities grouped by `documentType`

**Query:**
```typescript
const docTypeCounts = cases.reduce((acc, c) => {
  acc[c.documentType] = (acc[c.documentType] || 0) + 1;
  return acc;
}, {});
```

**Chart Configuration:**
```tsx
<BarChart
  data={[
    { label: 'Omang', value: 750 },
    { label: 'Passport', value: 180 },
    { label: 'Driver\'s License', value: 90 },
    { label: 'ID Card', value: 10 }
  ]}
  orientation="horizontal"
  color="#75AADB"
/>
```

---

#### 4. Processing Time Histogram
**Description:** Distribution of processing times.

**Data Source:** DynamoDB `CASE#` entities with processing time calculated

**Buckets:**
- < 30 minutes
- 30-60 minutes
- 1-2 hours
- 2-4 hours
- 4-8 hours
- > 8 hours

**Chart Configuration:**
```tsx
<HistogramChart
  data={processingTimeBuckets}
  xAxis="Time Range"
  yAxis="Count"
  color="#75AADB"
/>
```

---

### Filters & Controls

#### Date Range Picker
**Options:**
- Today
- Yesterday
- Last 7 days
- Last 30 days
- Last 90 days
- Custom range

**Implementation:**
```tsx
<DateRangePicker
  value={dateRange}
  onChange={setDateRange}
  presets={['today', 'yesterday', 'last7days', 'last30days', 'last90days']}
  maxDate={new Date()}
/>
```

---

#### Client Filter (Admin Only)
**Description:** Filter metrics by client ID.

**Data Source:** DynamoDB `CLIENT#` entities

**Implementation:**
```tsx
<Select
  label="Client"
  value={selectedClient}
  onChange={setSelectedClient}
  options={[
    { value: 'all', label: 'All Clients' },
    ...clients.map(c => ({ value: c.clientId, label: c.name }))
  ]}
/>
```

---

#### Status Filter
**Description:** Filter cases by status.

**Options:**
- All Statuses
- Approved
- Rejected
- Pending Review
- In Review
- Expired

---

### Real-time Updates

**Polling Strategy:**
- Metrics refresh every 30 seconds
- Charts refresh every 60 seconds
- Use WebSocket for real-time updates (Phase 2)

**Implementation:**
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    fetchMetrics();
  }, 30000); // 30 seconds

  return () => clearInterval(interval);
}, [dateRange, selectedClient]);
```

---

### Performance Optimization

#### Caching Strategy
- Cache metrics for 5 minutes
- Invalidate cache on case status change
- Use Redis for shared cache (Phase 2)

#### Query Optimization
- Use DynamoDB GSI for date range queries
- Aggregate data in Lambda for complex calculations
- Pre-calculate daily metrics with scheduled job

---

### Mobile Responsiveness

**Breakpoints:**
- Mobile (< 768px): Stack cards vertically, hide charts
- Tablet (768-1024px): 2-column grid, simplified charts
- Desktop (> 1024px): 4-column grid, full charts

**Mobile Optimizations:**
- Show only top 2 metrics on mobile
- Swipeable chart carousel
- Collapsible filters

---

## References

- [Epic 6: Reporting & Analytics](epics.md#epic-6-reporting--analytics)
- [Mantine Charts Documentation](https://mantine.dev/charts/getting-started/)
- [DynamoDB Query Patterns](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-query-scan.html)

---

_Last Updated: 2026-01-18_
_Ready for Story 6.1 Implementation_
