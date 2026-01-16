import { Button, Group, Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useApproveCase } from '../hooks/useApproveCase';
import { RejectReasonModal } from './RejectReasonModal';

// Botswana Blue from UX Design Spec
const BOTSWANA_BLUE = '#75AADB';

interface ApproveRejectButtonsProps {
  caseId: string;
  caseStatus: string;
}

export const ApproveRejectButtons = ({ caseId, caseStatus }: ApproveRejectButtonsProps) => {
  const [approveModalOpened, { open: openApproveModal, close: closeApproveModal }] = useDisclosure(false);
  const [rejectModalOpened, { open: openRejectModal, close: closeRejectModal }] = useDisclosure(false);

  const approveCase = useApproveCase();

  // Disable buttons if case is already decided
  const isDisabled = ['approved', 'rejected'].includes(caseStatus);

  const handleApprove = () => {
    approveCase.mutate(caseId, {
      onSuccess: () => {
        closeApproveModal();
      }
    });
  };

  return (
    <>
      <Group gap="md">
        <Button
          color={BOTSWANA_BLUE}
          onClick={openApproveModal}
          disabled={isDisabled}
          loading={approveCase.isPending}
          data-testid="approve-button"
        >
          Approve
        </Button>
        <Button
          color="red"
          onClick={openRejectModal}
          disabled={isDisabled}
          data-testid="reject-button"
        >
          Reject
        </Button>
      </Group>

      {/* Approve Confirmation Modal */}
      <Modal
        opened={approveModalOpened}
        onClose={closeApproveModal}
        title="Confirm Approval"
        size="md"
      >
        <p>Are you sure you want to approve this case?</p>
        <Group justify="flex-end" mt="md">
          <Button variant="outline" onClick={closeApproveModal}>
            Cancel
          </Button>
          <Button
            color={BOTSWANA_BLUE}
            onClick={handleApprove}
            loading={approveCase.isPending}
            data-testid="confirm-approve-button"
          >
            Confirm Approval
          </Button>
        </Group>
      </Modal>

      {/* Reject Reason Modal */}
      <RejectReasonModal
        opened={rejectModalOpened}
        onClose={closeRejectModal}
        caseId={caseId}
      />
    </>
  );
};
