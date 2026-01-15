import { Table, Text, ActionIcon, Tooltip, Skeleton, Box, Highlight } from '@mantine/core';
import { IconEye } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { CaseStatusBadge } from './CaseStatusBadge';
import { CaseListEmpty } from './CaseListEmpty';
import type { Case } from '../types';

interface CaseListTableProps {
  cases: Case[];
  isLoading?: boolean;
  hasFilters?: boolean;
  searchTerm?: string;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDocumentType(type: string): string {
  const typeMap: Record<string, string> = {
    omang: 'Omang',
    passport: 'Passport',
    drivers_licence: "Driver's Licence",
  };
  return typeMap[type] || type;
}

function LoadingSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <Table.Tr key={i}>
          <Table.Td><Skeleton height={20} width="80%" /></Table.Td>
          <Table.Td><Skeleton height={20} width="60%" /></Table.Td>
          <Table.Td><Skeleton height={24} width={80} radius="xl" /></Table.Td>
          <Table.Td><Skeleton height={20} width="70%" /></Table.Td>
          <Table.Td><Skeleton height={20} width="60%" /></Table.Td>
          <Table.Td><Skeleton height={20} width="50%" /></Table.Td>
          <Table.Td><Skeleton height={28} width={28} radius="sm" /></Table.Td>
        </Table.Tr>
      ))}
    </>
  );
}

/**
 * Prepare highlight terms for search result highlighting
 * Handles special case for Omang numbers (masked format: ***XXXX)
 */
function prepareHighlightTerms(searchTerm: string): string[] {
  if (!searchTerm) return [];

  const terms = searchTerm.split(/\s+/).filter(Boolean);
  const expandedTerms: string[] = [];

  for (const term of terms) {
    expandedTerms.push(term);
    // If term is numeric (likely Omang last 4 digits), also match masked format
    if (/^\d{1,4}$/.test(term)) {
      expandedTerms.push(`***${term.padStart(4, '0').slice(-4)}`);
      // Also match partial (e.g., searching "89" should highlight "***6789")
      expandedTerms.push(term);
    }
  }

  return [...new Set(expandedTerms)];
}

export function CaseListTable({ cases, isLoading, hasFilters, searchTerm = '' }: CaseListTableProps) {
  const navigate = useNavigate();

  const handleRowClick = (caseId: string) => {
    navigate(`/cases/${caseId}`);
  };

  if (!isLoading && cases.length === 0) {
    return <CaseListEmpty hasFilters={hasFilters} />;
  }

  // Prepare highlight terms with special Omang handling
  const highlightTerms = prepareHighlightTerms(searchTerm);

  return (
    <Box style={{ overflowX: 'auto' }}>
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Customer Name</Table.Th>
            <Table.Th>Omang</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Document Type</Table.Th>
            <Table.Th>Assignee</Table.Th>
            <Table.Th>Date</Table.Th>
            <Table.Th w={60}>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {isLoading ? (
            <LoadingSkeleton />
          ) : (
            cases.map((caseItem) => (
              <Table.Tr
                key={caseItem.caseId}
                onClick={() => handleRowClick(caseItem.caseId)}
                style={{ cursor: 'pointer' }}
              >
                <Table.Td>
                  {highlightTerms.length > 0 ? (
                    <Highlight highlight={highlightTerms} fw={500} size="sm">
                      {caseItem.customerName}
                    </Highlight>
                  ) : (
                    <Text fw={500} size="sm">
                      {caseItem.customerName}
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  {highlightTerms.length > 0 && caseItem.omangNumber ? (
                    <Highlight highlight={highlightTerms} c="dimmed" ff="monospace" size="sm">
                      {caseItem.omangNumber}
                    </Highlight>
                  ) : (
                    <Text c="dimmed" ff="monospace" size="sm">
                      {caseItem.omangNumber || '-'}
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <CaseStatusBadge status={caseItem.status} />
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{formatDocumentType(caseItem.documentType)}</Text>
                </Table.Td>
                <Table.Td>
                  {highlightTerms.length > 0 && caseItem.assignee ? (
                    <Highlight highlight={highlightTerms} size="sm">
                      {caseItem.assignee}
                    </Highlight>
                  ) : (
                    <Text size="sm" c={caseItem.assignee ? undefined : 'dimmed'}>
                      {caseItem.assignee || 'Unassigned'}
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {formatDate(caseItem.createdAt)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Tooltip label="View details">
                    <ActionIcon
                      variant="subtle"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick(caseItem.caseId);
                      }}
                      aria-label={`View case ${caseItem.caseId}`}
                    >
                      <IconEye size={18} />
                    </ActionIcon>
                  </Tooltip>
                </Table.Td>
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>
    </Box>
  );
}
