import { useParams, useNavigate } from 'react-router-dom';
import { Container, Grid, Paper, Group, Button, Title, Skeleton, Alert, Stack } from '@mantine/core';
import { IconArrowLeft, IconAlertCircle } from '@tabler/icons-react';
import { useCase } from '../hooks/useCase';
import { CustomerInfoPanel } from '../components/CustomerInfoPanel';
import { DocumentViewer } from '../components/DocumentViewer';
import { VerificationChecks } from '../components/VerificationChecks';
import { OCRDataPanel } from '../components/OCRDataPanel';
import { SelfieComparison } from '../components/SelfieComparison';
import { CaseHistory } from '../components/CaseHistory';
import { CaseStatusBadge } from '../components/CaseStatusBadge';

export const CaseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: caseData, isLoading, error } = useCase(id);

  if (isLoading) {
    return <CaseDetailSkeleton />;
  }

  if (error || !caseData) {
    return (
      <Container size="xl" py="xl">
        <Alert icon={<IconAlertCircle />} title="Error" color="red">
          {(error as Error)?.message || 'Case not found'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl" py="md">
      <Group justify="space-between" mb="lg">
        <Group>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate('/cases')}
          >
            Back to Cases
          </Button>
          <Title order={2}>Case: {caseData.caseId}</Title>
        </Group>
        <CaseStatusBadge status={caseData.status} size="lg" />
      </Group>

      <Grid gutter="md">
        {/* Left Column: Documents */}
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <Paper p="md" withBorder mb="md">
            <DocumentViewer documents={caseData.documents} />
          </Paper>
          <Paper p="md" withBorder>
            <SelfieComparison
              selfie={caseData.documents.selfie}
              faceMatch={caseData.verificationChecks.faceMatch}
              liveness={caseData.verificationChecks.liveness}
            />
          </Paper>
        </Grid.Col>

        {/* Right Column: Info & Checks */}
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <Paper p="md" withBorder mb="md">
            <CustomerInfoPanel customer={caseData.customer} metadata={caseData.metadata} />
          </Paper>
          <Paper p="md" withBorder mb="md">
            <VerificationChecks checks={caseData.verificationChecks} />
          </Paper>
          <Paper p="md" withBorder>
            <OCRDataPanel extractedData={caseData.extractedData} />
          </Paper>
        </Grid.Col>

        {/* Full Width: History */}
        <Grid.Col span={12}>
          <Paper p="md" withBorder>
            <CaseHistory history={caseData.history} />
          </Paper>
        </Grid.Col>
      </Grid>
    </Container>
  );
};

const CaseDetailSkeleton = () => (
  <Container size="xl" py="md">
    <Group justify="space-between" mb="lg">
      <Skeleton height={40} width={200} />
      <Skeleton height={32} width={100} />
    </Group>

    <Grid gutter="md">
      <Grid.Col span={{ base: 12, lg: 6 }}>
        <Paper p="md" withBorder mb="md">
          <Skeleton height={400} />
        </Paper>
        <Paper p="md" withBorder>
          <Skeleton height={300} />
        </Paper>
      </Grid.Col>

      <Grid.Col span={{ base: 12, lg: 6 }}>
        <Paper p="md" withBorder mb="md">
          <Stack gap="sm">
            <Skeleton height={20} width="60%" />
            <Skeleton height={16} />
            <Skeleton height={16} />
            <Skeleton height={16} />
          </Stack>
        </Paper>
        <Paper p="md" withBorder mb="md">
          <Skeleton height={200} />
        </Paper>
        <Paper p="md" withBorder>
          <Skeleton height={150} />
        </Paper>
      </Grid.Col>

      <Grid.Col span={12}>
        <Paper p="md" withBorder>
          <Skeleton height={200} />
        </Paper>
      </Grid.Col>
    </Grid>
  </Container>
);
