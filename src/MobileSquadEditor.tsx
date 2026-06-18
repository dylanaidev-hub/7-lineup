import { Pencil, Plus, Trash2, X } from "lucide-react";
import type { BasePlayer, MobilePlayerEditorProps, MobileSquadDrawerProps } from "./squadEditorTypes";

export function MobilePlayerEditor<TPlayer extends BasePlayer>({
  copy,
  players,
  selectedPlayer,
  getPositionLabel,
  onSelectedPlayerChange,
  onRenamePlayer,
  onRenameExtraPlayer,
  onAddPlayerInput,
  onRemoveExtraPlayerInput,
}: MobilePlayerEditorProps<TPlayer>) {
  if (!selectedPlayer) return null;

  return (
    <div className="mobile-player-editor">
      <div className="mobile-player-editor-top">
        <label htmlFor="mobile-player-select">{copy.player}</label>
        <select
          id="mobile-player-select"
          value={selectedPlayer.id}
          onChange={(event) => onSelectedPlayerChange(Number(event.target.value))}
        >
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.id}. {getPositionLabel(player.position)}
            </option>
          ))}
        </select>
      </div>
      <div className="mobile-player-inputs">
        <input
          value={selectedPlayer.starterName}
          onChange={(event) => onRenamePlayer(selectedPlayer.id, "starterName", event.target.value)}
          placeholder={copy.starterPlaceholder}
        />
        <input
          value={selectedPlayer.substituteName}
          onChange={(event) => onRenamePlayer(selectedPlayer.id, "substituteName", event.target.value)}
          placeholder={copy.substitutePlaceholder}
        />
        {selectedPlayer.extraNames.slice(0, 1).map((extraName, index) => (
          <div key={index} className="mobile-extra-player-input">
            <input
              value={extraName}
              onChange={(event) => onRenameExtraPlayer(selectedPlayer.id, index, event.target.value)}
              placeholder={`${copy.extraPlayerPlaceholder} ${index + 3}`}
            />
            <button
              type="button"
              onClick={() => onRemoveExtraPlayerInput(selectedPlayer.id, index)}
              aria-label={`${copy.delete} ${copy.player} ${index + 3}`}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {selectedPlayer.extraNames.length < 1 ? (
          <button
            type="button"
            className="mobile-add-player"
            onClick={() => onAddPlayerInput(selectedPlayer.id)}
          >
            <Plus size={14} />
            {copy.addSubstitute}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function MobileSquadDrawer<TPlayer extends BasePlayer>({
  copy,
  players,
  isOpen,
  getPositionLabel,
  onOpen,
  onClose,
  onRenamePlayer,
  onRenameExtraPlayer,
  onAddPlayerInput,
  onRemoveExtraPlayerInput,
}: MobileSquadDrawerProps<TPlayer>) {
  return (
    <>
      <button
        type="button"
        className="mobile-squad-toggle"
        onClick={onOpen}
        aria-label={copy.squadEditor}
        title={copy.squadEditor}
      >
        <Pencil size={18} />
      </button>
      <div className={`mobile-squad-drawer ${isOpen ? "open" : ""}`} aria-hidden={!isOpen}>
        <div className="mobile-squad-drawer-header">
          <span>{copy.squadEditor}</span>
          <button type="button" onClick={onClose} aria-label={copy.close}>
            <X size={18} />
          </button>
        </div>
        <div className="mobile-squad-drawer-list">
          {players.map((player) => (
            <div key={player.id} className="mobile-squad-player-card">
              <div className="mobile-squad-player-title">
                <span>{player.id}</span>
                <strong>{getPositionLabel(player.position)}</strong>
                <button
                  type="button"
                  onClick={() => onAddPlayerInput(player.id)}
                  disabled={player.extraNames.length >= 1}
                  aria-label={`${copy.addPlayer} ${player.id}`}
                >
                  <Plus size={14} />
                </button>
              </div>
              <input
                value={player.starterName}
                onChange={(event) => onRenamePlayer(player.id, "starterName", event.target.value)}
                placeholder={copy.starterPlaceholder}
              />
              <input
                value={player.substituteName}
                onChange={(event) => onRenamePlayer(player.id, "substituteName", event.target.value)}
                placeholder={copy.substitutePlaceholder}
              />
              {player.extraNames.slice(0, 1).map((extraName, index) => (
                <div key={index} className="mobile-squad-extra-input">
                  <input
                    value={extraName}
                    onChange={(event) => onRenameExtraPlayer(player.id, index, event.target.value)}
                    placeholder={`${copy.extraPlayerPlaceholder} ${index + 3}`}
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveExtraPlayerInput(player.id, index)}
                    aria-label={`${copy.delete} ${copy.player} ${index + 3}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
