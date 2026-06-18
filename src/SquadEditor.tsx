import { Plus, Trash2 } from "lucide-react";
import type { BasePlayer, SquadEditorProps } from "./squadEditorTypes";

export function SquadEditor<TPlayer extends BasePlayer>({
  copy,
  players,
  benchCount,
  getPositionLabel,
  onRenamePlayer,
  onRenameExtraPlayer,
  onAddPlayerInput,
  onRemoveExtraPlayerInput,
}: SquadEditorProps<TPlayer>) {
  return (
    <section className="stats-column">
      <div className="panel-heading">
        <span>{copy.squadEditor}</span>
        <strong>
          {benchCount}/{players.length} {copy.subs}
        </strong>
      </div>
      <div className="squad-editor">
        {players.map((player) => (
          <div key={player.id} className="squad-row">
            <div className="squad-row-header">
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
            <div className="squad-input-list">
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
                <div key={index} className="extra-player-input">
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
          </div>
        ))}
      </div>
    </section>
  );
}

export { MobilePlayerEditor, MobileSquadDrawer } from "./MobileSquadEditor";
