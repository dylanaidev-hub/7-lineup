export type BasePlayer = {
  id: number;
  position: string;
  starterName: string;
  substituteName: string;
  extraNames: string[];
};

export type SquadEditorCopy = {
  squadEditor: string;
  subs: string;
  starterPlaceholder: string;
  substitutePlaceholder: string;
  extraPlayerPlaceholder: string;
  addPlayer: string;
  addSubstitute: string;
  delete: string;
  close: string;
  player: string;
};

export type PlayerNameField = "starterName" | "substituteName";

export type SharedPlayerEditorProps<TPlayer extends BasePlayer> = {
  copy: SquadEditorCopy;
  getPositionLabel: (position: string) => string;
  onRenamePlayer: (id: number, field: PlayerNameField, name: string) => void;
  onRenameExtraPlayer: (id: number, index: number, name: string) => void;
  onAddPlayerInput: (id: number) => void;
  onRemoveExtraPlayerInput: (id: number, index: number) => void;
};

export type SquadEditorProps<TPlayer extends BasePlayer> = SharedPlayerEditorProps<TPlayer> & {
  players: TPlayer[];
  benchCount: number;
};

export type MobilePlayerEditorProps<TPlayer extends BasePlayer> = SharedPlayerEditorProps<TPlayer> & {
  players: TPlayer[];
  selectedPlayer: TPlayer | null;
  onSelectedPlayerChange: (id: number) => void;
};

export type MobileSquadDrawerProps<TPlayer extends BasePlayer> = SharedPlayerEditorProps<TPlayer> & {
  players: TPlayer[];
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
};
