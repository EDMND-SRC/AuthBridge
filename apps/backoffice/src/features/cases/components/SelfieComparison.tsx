import { Stack, Text, Group, Image, Paper, Badge, Progress, Center, Loader } from '@mantine/core';
import { useState } from 'react';

interface SelfieComparisonProps {
  selfie: { url: string; uploadedAt: string };
  faceMatch: { score: number; status: 'pass' | 'fail' | 'review' };
  liveness: { status: 'pass' | 'fail'; confidence: number };
}

export const SelfieComparison = ({ selfie, faceMatch, liveness }: SelfieComparisonProps) => {
  const getMatchColor = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    return 'red';
  };

  return (
    <Stack gap="md">
      <Text fw={600} size="lg">
        Selfie & Face Match
      </Text>

      {/* Selfie Image */}
      <Paper p="md" withBorder>
        <SelfieImage url={selfie.url} />
      </Paper>

      {/* Face Match Score */}
      <Paper p="md" withBorder>
        <Stack gap="sm">
          <Group justify="space-between">
            <Text size="sm" fw={500}>
              Face Match Score
            </Text>
            <Badge color={getMatchColor(faceMatch.score)} size="lg">
              {faceMatch.score}%
            </Badge>
          </Group>
          <Progress
            value={faceMatch.score}
            color={getMatchColor(faceMatch.score)}
            size="lg"
            animated={faceMatch.status === 'review'}
          />
          <Text size="xs" c="dimmed">
            {faceMatch.score >= 80 && '✓ Strong match - selfie matches ID photo'}
            {faceMatch.score >= 60 &&
              faceMatch.score < 80 &&
              '⚠️ Moderate match - manual review recommended'}
            {faceMatch.score < 60 && '✗ Weak match - likely different person'}
          </Text>
        </Stack>
      </Paper>

      {/* Liveness Detection */}
      <Paper p="md" withBorder>
        <Group justify="space-between">
          <Text size="sm" fw={500}>
            Liveness Detection
          </Text>
          <Badge color={liveness.status === 'pass' ? 'green' : 'red'}>
            {liveness.status === 'pass' ? 'Pass' : 'Fail'}
          </Badge>
        </Group>
        <Text size="xs" c="dimmed" mt="xs">
          Confidence: {liveness.confidence}%
        </Text>
        <Text size="xs" c="dimmed" mt="xs">
          {liveness.status === 'pass'
            ? '✓ Real person detected (not photo/video)'
            : '✗ Liveness check failed - possible spoof attempt'}
        </Text>
      </Paper>
    </Stack>
  );
};

const SelfieImage = ({ url }: { url: string }) => {
  const [loading, setLoading] = useState(true);

  return (
    <Center style={{ minHeight: 300 }}>
      {loading && <Loader />}
      <Image
        src={url}
        alt="Selfie"
        style={{ display: loading ? 'none' : 'block' }}
        onLoad={() => setLoading(false)}
        fit="contain"
        h={300}
        radius="md"
      />
    </Center>
  );
};
