export default function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <p className="modal__message">{message}</p>
        <div className="modal__actions">
          <button className="btn btn--outline" onClick={onCancel}>Отмена</button>
          <button className="btn btn--danger" onClick={onConfirm}>Подтвердить</button>
        </div>
      </div>
    </div>
  );
}
