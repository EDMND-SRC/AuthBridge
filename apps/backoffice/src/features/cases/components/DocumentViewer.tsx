import { useState } from 'react';
import { Tabs, Image, Group, ActionIcon, Slider, Text, Stack, Center, Loader } from '@mantine/core';
import { IconZoomIn, IconZoomOut, IconRotateClockwise, IconSun } from '@tabler/icons-react';

interface DocumentViewerProps {
  documents: {
    front?: { url: string; uploadedAt: string };
    back?: { url: string; uploadedAt: string };
  };
}

export const DocumentViewer = ({ documents }: DocumentViewerProps) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [activeTab, setActiveTab] = useState<string | null>('front');

  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));

  const imageStyle = {
    transform: `scale(${zoom}) rotate(${rotation}deg)`,
    filter: `brightness(${brightness}%)`,
    transition: 'transform 0.2s ease',
  };

  return (
    <Stack gap="md">
      <Text fw={600} size="lg">
        Document Images
      </Text>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="front" disabled={!documents.front}>
            Front
          </Tabs.Tab>
          <Tabs.Tab value="back" disabled={!documents.back}>
            Back
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="front" pt="md">
          {documents.front ? (
            <DocumentImage url={documents.front.url} style={imageStyle} />
          ) : (
            <Center h={300}>
              <Text c="dimmed">No front image</Text>
            </Center>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="back" pt="md">
          {documents.back ? (
            <DocumentImage url={documents.back.url} style={imageStyle} />
          ) : (
            <Center h={300}>
              <Text c="dimmed">No back image</Text>
            </Center>
          )}
        </Tabs.Panel>
      </Tabs>

      {/* Controls */}
      <Group justify="center" gap="lg">
        <Group gap="xs">
          <ActionIcon variant="light" onClick={handleZoomOut} title="Zoom out" aria-label="Zoom out">
            <IconZoomOut size={18} />
          </ActionIcon>
          <Text size="sm" w={50} ta="center">
            {Math.round(zoom * 100)}%
          </Text>
          <ActionIcon variant="light" onClick={handleZoomIn} title="Zoom in" aria-label="Zoom in">
            <IconZoomIn size={18} />
          </ActionIcon>
        </Group>

        <ActionIcon variant="light" onClick={handleRotate} title="Rotate 90°" aria-label="Rotate 90 degrees">
          <IconRotateClockwise size={18} />
        </ActionIcon>

        <Group gap="xs" w={150}>
          <IconSun size={16} aria-hidden="true" />
          <Slider
            value={brightness}
            onChange={setBrightness}
            min={50}
            max={150}
            size="sm"
            style={{ flex: 1 }}
            aria-label="Adjust brightness"
          />
        </Group>
      </Group>
    </Stack>
  );
};

const DocumentImage = ({ url, style }: { url: string; style: React.CSSProperties }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <Center style={{ minHeight: 300 }}>
        <Text c="red" size="sm">Failed to load image. The URL may have expired.</Text>
      </Center>
    );
  }

  return (
    <Center style={{ overflow: 'hidden', minHeight: 300 }}>
      {loading && <Loader />}
      <Image
        src={url}
        alt="Document"
        style={{ ...style, display: loading ? 'none' : 'block' }}
        onLoad={() => setLoading(false)}
        onError={() => setError(true)}
        fit="contain"
        h={400}
      />
    </Center>
  );
};
