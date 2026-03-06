import type { FC } from "react";

interface Props {
  onClose: () => void;
  onAccept: () => void;
  onDecline: () => void;
}

const InvitationDecisionModal: FC<Props> = ({
  onClose,
  onAccept,
  onDecline,
}) => {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Review Invitation</h3>
        <p>
          Are you available to review this manuscript within the requested
          timeline?
        </p>

        <div className="modal-actions">
          <button className="btn-outline" onClick={onDecline}>
            Decline
          </button>

          <button className="btn-primary" onClick={onAccept}>
            Accept
          </button>
        </div>

        <button className="modal-close" onClick={onClose}>
          ✕
        </button>
      </div>
    </div>
  );
};

export default InvitationDecisionModal;