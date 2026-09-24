/* ==========================================================================
   CTRL+CD 3D — tipos (usados só na verificação TypeScript dos arquivos .js com @ts-check).
   Este arquivo não é carregado pelo navegador.
   ========================================================================== */

type Vec3 = [number, number, number];

interface MathApi {
  identity(): Float32Array;
  multiply(a: ArrayLike<number>, b: ArrayLike<number>): Float32Array;
  perspective(fovY: number, aspect: number, near: number, far: number): Float32Array;
  lookAt(eye: Vec3, target: Vec3, up: Vec3): Float32Array;
  fromTRS(t?: number[], q?: number[], s?: number[]): Float32Array;
  transformPoint(m: ArrayLike<number>, p: Vec3): Vec3;
  isIdentity(m: ArrayLike<number>): boolean;
  invert(m: ArrayLike<number>): Float32Array | null;
  sub(a: Vec3, b: Vec3): Vec3;
  add(a: Vec3, b: Vec3): Vec3;
  scale(a: Vec3, s: number): Vec3;
  dot(a: Vec3, b: Vec3): number;
  cross(a: Vec3, b: Vec3): Vec3;
  length(a: Vec3): number;
  normalize(a: Vec3): Vec3;
  clamp(v: number, lo: number, hi: number): number;
}

interface GlbMaterial {
  name: string;
  color: Vec3;
  roughness: number;
  metallic: number;
}

interface GlbPrimitive {
  /** nome do nó do GLB que contém a malha (ex.: "wing_left") */
  nodeName: string;
  /** caminho de nomes da raiz até o nó (ex.: ["aircraft", "powerplant_left", "engine_left"]) */
  nodePath: string[];
  world: Float32Array;
  positions: Float32Array;
  normals: Float32Array | null;
  indices: Uint8Array | Uint16Array | Uint32Array | null;
  material: GlbMaterial;
  triangles: number;
}

interface GlbBounds {
  min: Vec3;
  max: Vec3;
  center: Vec3;
  size: Vec3;
  radius: number;
}

interface GlbModel {
  url: string;
  bytes: number;
  loadMs: number;
  primitives: GlbPrimitive[];
  nodeNames: string[];
  meshNodeNames: string[];
  triangles: number;
  bounds: GlbBounds;
  generator: string;
  notice: string | null;
}

interface LoadProgress {
  loaded: number;
  total: number | null;
}

interface LoaderApi {
  loadModel(url: string, opts?: { signal?: AbortSignal; onProgress?: (p: LoadProgress) => void }): Promise<GlbModel>;
  parseGlb(buffer: ArrayBuffer, url: string, loadMs: number): GlbModel;
  clearCache(): void;
  readonly downloads: number;
}

interface CameraState {
  target: Vec3;
  distance: number;
  /** ângulo horizontal (rad), medido no plano XZ a partir de +X */
  yaw: number;
  /** elevação (rad); positivo = acima do alvo */
  pitch: number;
}

interface CameraLimits {
  minDistance: number;
  maxDistance: number;
  minPitch: number;
  maxPitch: number;
  targetMin: Vec3;
  targetMax: Vec3;
}

interface CameraUtilsApi {
  calculateObjectBounds(model: GlbModel): GlbBounds;
  fitDistance(bounds: GlbBounds, fovY: number, aspect: number, view?: { yaw: number; pitch: number }, margin?: number): number;
  fitCameraToObject(bounds: GlbBounds, fovY: number, aspect: number, view?: { yaw: number; pitch: number }): CameraState;
  cameraLimits(bounds: GlbBounds, fitDist: number): CameraLimits;
  eyePosition(state: CameraState): Vec3;
  animateCameraToTarget(from: CameraState, to: CameraState, ms: number, onFrame: (s: CameraState) => void, onDone?: () => void): () => void;
  resetCamera(current: CameraState, initial: CameraState, onFrame: (s: CameraState) => void, onDone?: () => void): () => void;
  /** raio que sai da câmera pelo ponto da tela em coordenadas normalizadas (−1..1) */
  rayFromScreen(s: CameraState, fovY: number, aspect: number, ndcX: number, ndcY: number): { origin: Vec3; dir: Vec3 };
  projectPoint(s: CameraState, fovY: number, aspect: number, p: Vec3): { ndcX: number; ndcY: number; depth: number; inFront: boolean };
  boundsFromBox(min: Vec3, max: Vec3): GlbBounds;
  INITIAL_VIEW: { yaw: number; pitch: number };
}

interface RendererOptions {
  fovY: number;
  maxPixelRatio: number;
  onContextLost: () => void;
}

interface RendererApi {
  createRenderer(canvas: HTMLCanvasElement, model: GlbModel, opts: RendererOptions): AircraftRenderer;
  isWebGL2Available(): boolean;
}

/** Realce por região (IDs lógicos; uma malha é realçada se o seu caminho no GLB contém o ID). */
interface RenderHighlight {
  hover?: string | null;
  selected?: string | null;
  confirmed?: string | null;
  /** nó do GLB em foco: o que estiver fora dele é esmaecido (null = nada esmaecido) */
  focus?: string | null;
  /** marcador da não conformidade (Fase 5) */
  marker?: RenderMarker | null;
}

interface RenderMarker {
  position: Vec3;
  normal: Vec3;
  confirmed: boolean;
}

/** Ponto da não conformidade (seção 9 da especificação): só números e strings. */
interface DefectPosition {
  /** região da hierarquia confirmada onde o ponto está (pode não ter geometria própria) */
  regionId: string;
  /** região com geometria efetivamente atingida (ex.: wing_left para um ponto nos slats) */
  meshRegionId: string;
  meshName: string;
  localPosition: Vec3;
  worldPosition: Vec3;
  surfaceNormal: Vec3;
  referenceView: AircraftView;
  confirmed: boolean;
}

interface AircraftRenderer {
  render(state: CameraState, hl?: RenderHighlight, opt?: { grid?: boolean }): void;
  resize(): { width: number; height: number };
  aspect(): number;
  dispose(): void;
  readonly frames: number;
  readonly lastFrameMs: number;
}

interface ControlsApi {
  attachOrbitControls(el: HTMLElement, opts: {
    getState(): CameraState;
    setState(s: CameraState): void;
    getLimits(): CameraLimits;
    fovY: number;
    /** arrasto além de 4 px, pinça, roda ou teclado */
    onInteractionStart?: () => void;
    /** qualquer toque/clique no canvas (inclusive um clique de seleção) */
    onPointerContact?: () => void;
  }): { dispose(): void; update(): boolean; readonly active: boolean; readonly dragging: boolean };
}

type AircraftView =
  | "perspective"
  | "isometric"
  | "top"
  | "bottom"
  | "front"
  | "rear"
  | "left"
  | "right";

interface ViewPreset {
  id: AircraftView;
  label: string;
  shortLabel: string;
  yaw: number;
  pitch: number;
  description: string;
}

interface ViewPresetsApi {
  readonly PRESETS: readonly ViewPreset[];
  get(id: AircraftView): ViewPreset;
  cameraFor(id: AircraftView, bounds: GlbBounds, fovY: number, aspect: number): CameraState;
}

interface NavigationHandlers {
  onPreset(id: AircraftView): void;
  onZoom(factor: number): void;
  onFit(): void;
  onReset(): void;
  onToggleRotate(): void;
  onToggleFullscreen(): void;
}

interface NavigationToolbar {
  element: HTMLElement;
  setEnabled(on: boolean): void;
  setActivePreset(id: AircraftView | null): void;
  setAutoRotate(on: boolean): void;
  disableAutoRotate(reason: string): void;
  setFullscreen(on: boolean): void;
}

interface NavigationApi {
  createToolbar(handlers: NavigationHandlers): NavigationToolbar;
  createAutoRotate(step: (dYaw: number) => void): { readonly running: boolean; start(): boolean; stop(): void };
  createFullscreen(el: HTMLElement, onChange: () => void): { readonly active: boolean; readonly native: boolean; toggle(): Promise<void>; dispose(): void };
  reducedMotion(): boolean;
}

// ---------- Fase 3: regiões, raycast, seleção e painéis ----------

type RegionSide = "left" | "right" | "center";
type RegionLevel = 1 | 2 | 3 | 4 | 5 | 6;

interface AircraftRegion3D {
  id: string;
  label: string;
  level: RegionLevel;
  parentId?: string;
  side: RegionSide;
  category: string;
  selectable: boolean;
}

interface RegionsApi {
  readonly AIRCRAFT_REGIONS: readonly AircraftRegion3D[];
  readonly AIRCRAFT_MESH_MAP: Readonly<Record<string, string[]>>;
  readonly AUXILIARY_NODES: string[];
  readonly ROOT_ID: string;
  readonly LEVEL_LABELS: Readonly<Record<RegionLevel, string>>;
  get(id: string): AircraftRegion3D;
  pathOf(id: string): string[];
  leafForNode(nodeName: string, x: number): string | null;
  targetFor(leafId: string, focusId: string): string | null;
  isDescendantOf(id: string, ancestorId: string): boolean;
  nodeFor(id: string, available: readonly string[]): string | null;
  geometryFor(id: string, available: readonly string[]): { regionId: string; node: string; own: boolean } | null;
  meshNodesOf(id: string, available: string[]): string[];
  childrenOf(focusId: string): AircraftRegion3D[];
  hasChildren(id: string): boolean;
  locationFrom(confirmedPath: readonly string[], o: { view: AircraftView; partial: boolean }): AircraftLocation;
  labelOf(loc: AircraftLocation): string;
}

/** Localização estruturada e serializável (seção 9 da especificação). Sem objetos gráficos. */
interface AircraftLocation {
  aircraftModel: "E195-E2-demonstrativo";
  currentView: AircraftView;
  /** rótulos do nível 2 até o mais profundo confirmado */
  locationPath: string[];
  /** IDs correspondentes a locationPath */
  locationIds: string[];
  regionId?: string;
  sectionId?: string;
  structureId?: string;
  componentId?: string;
  partial: boolean;
  confirmed: boolean;
  /** a confirmação é sempre do usuário; nada é identificado automaticamente */
  confirmedBy: "user";
  /** origem da localização: visualizador 3D ou fallback 2D (vistas técnicas) */
  source?: "3d" | "2d";
  defectPosition?: DefectPosition;
  /** ponto aproximado marcado numa vista técnica 2D (fallback) */
  approximatePoint?: ApproximatePoint2D;
  /** metadados da captura; a imagem fica só no navegador (IndexedDB) */
  snapshot?: { width: number; height: number; createdAt: string; bytes: number };
}

/** Ponto aproximado numa vista técnica 2D: coordenadas do desenho e metros aproximados. */
interface ApproximatePoint2D {
  view: "top";
  viewLabel: string;
  regionId: string;
  svg: [number, number];
  /** distância aproximada a partir do nariz, em metros */
  longitudinal_m: number;
  /** distância lateral aproximada ao eixo, em metros (positiva para o lado DIREITO da aeronave) */
  lateral_m: number;
  confirmed: boolean;
}

/** Segundo argumento de onConfirm (o primeiro continua sendo o texto de regionSelected). */
interface LocationConfirmDetail {
  label: string;
  location: AircraftLocation;
  /** captura em data URL (JPEG); o formulário a guarda em IndexedDB */
  snapshotDataUrl: string | null;
}

interface AircraftLocationApi {
  SnapshotStore: {
    save(recordId: string, dataUrl: string): Promise<void>;
    load(recordId: string): Promise<string | null>;
    peek(recordId: string): string | null;
    remove(recordId: string): Promise<void>;
  };
  summary(loc: AircraftLocation): string;
  pointText(loc: AircraftLocation): string | null;
  rows(loc: AircraftLocation | null | undefined): [string, string][];
  readonly CONFIRM_TEXT: string;
}

/** Índice de raycast (BVH) sobre os triângulos do modelo no espaço do mundo. */
interface RayIndex {
  V: Float32Array;
  P: Int32Array;
  order: Uint32Array;
  bmin: Float32Array;
  bmax: Float32Array;
  first: Int32Array;
  count: Int32Array;
  nodes: number;
  triangles: number;
  buildMs: number;
}

interface RayHit {
  distance: number;
  point: Vec3;
  /** normal da face voltada para o observador */
  normal: Vec3;
  triangle: number;
  primitiveIndex: number;
  nodeName: string;
  barycentric: Vec3;
}

interface RaycasterApi {
  build(model: GlbModel): RayIndex;
  buildAsync(model: GlbModel): Promise<RayIndex>;
  raycast(model: GlbModel, ix: RayIndex, origin: Vec3, dir: Vec3, accept?: (primitiveIndex: number) => boolean): RayHit | null;
  isBuilt(model: GlbModel): boolean;
}

/** Resultado serializável de um raycast na tela. */
interface PickResult {
  /** região folha atingida (nível 3, ou 2 nas asas) */
  leafId: string;
  /** região que o clique seleciona, dado o foco atual (filho direto do foco) */
  targetId: string | null;
  nodeName: string;
  /** índice da malha em GlbModel.primitives (para a posição local) */
  primitiveIndex: number;
  distance: number;
  point: Vec3;
  normal: Vec3;
}

interface SelectionOptions {
  getModel(): GlbModel | null;
  getCanvas(): HTMLCanvasElement;
  getCamera(): CameraState;
  fovY: number;
  getFocus(): string;
  getSelected(): string | null;
  tooltip: HTMLElement;
  enabled(): boolean;
  isNavigating(): boolean;
  onHover(id: string | null): void;
  onSelect(id: string, pick: PickResult): void;
  onZoomTo(id: string): void;
  /** linhas da dica quando o ponto atingido não é alvo de seleção (fora do foco etc.); null = sem dica */
  describeNonTarget?(pick: PickResult): string[] | null;
}

interface SelectionController {
  attach(): void;
  pick(clientX: number, clientY: number): PickResult | null;
  hideTooltip(): void;
  readonly tooltipVisible: boolean;
  dispose(): void;
}

interface SelectionApi {
  createSelection(o: SelectionOptions): SelectionController;
}

// ---------- Fase 5: marcador ----------

interface MarkerAttempt {
  ok: boolean;
  /** linhas da dica / mensagem (a primeira é o título) */
  lines: string[];
}

interface MarkerToolOptions {
  host: HTMLElement;
  getCanvas(): HTMLCanvasElement;
  getCamera(): CameraState;
  fovY: number;
  tooltip: HTMLElement;
  pick(clientX: number, clientY: number): PickResult | null;
  validate(p: PickResult): MarkerAttempt;
  isMarking(): boolean;
  isNavigating(): boolean;
  canDrag(): boolean;
  getMarker(): { position: Vec3; normal: Vec3 } | null;
  onPlace(p: PickResult, how: "click" | "drag" | "center"): void;
  onDragEnd(): void;
  onRejected(v: MarkerAttempt): void;
}

interface MarkerTool {
  attach(): void;
  placeAtCenter(): MarkerAttempt;
  hideTooltip(): void;
  readonly tooltipVisible: boolean;
  readonly dragging: boolean;
  dispose(): void;
}

interface MarkerApi {
  createMarkerTool(o: MarkerToolOptions): MarkerTool;
}

interface SelectionViewState {
  focusId: string;
  selectedId: string | null;
  hoverId: string | null;
}

/** Estado da hierarquia (Fase 4): só IDs e dados serializáveis. */
interface HierarchyViewState extends SelectionViewState {
  /** IDs confirmados pelo usuário, da raiz ("aircraft") até o foco atual */
  confirmedPath: string[];
  /** localização finalizada; null enquanto em andamento */
  location: AircraftLocation | null;
  /** ponto da não conformidade (nível 6); null se não marcado */
  marker: DefectPosition | null;
  /** captura gerada após a confirmação (data URL), ou null */
  snapshot: string | null;
  markMode: boolean;
  /** há região confirmada (nível ≥ 2) e a localização não está finalizada */
  canMark: boolean;
}

interface PanelsHandlers {
  onSelect(id: string): void;
  onHover(id: string | null): void;
  onZoom(): void;
  onClear(): void;
  onConfirm(): void;
  onBack(): void;
  onCrumb(index: number): void;
  onFinalize(): void;
  onEdit(): void;
  onMarkMode(): void;
  onMarkCenter(): void;
  onRemoveMarker(): void;
  onConfirmPoint(): void;
  onUseLocation(): void;
  geometryOf(id: string): { regionId: string; own: boolean } | null;
}

interface SelectionPanels {
  left: HTMLElement;
  right: HTMLElement;
  update(s: HierarchyViewState): void;
  setEnabled(on: boolean): void;
  announce(text: string): void;
}

interface PanelsApi {
  createPanels(handlers: PanelsHandlers): SelectionPanels;
  readonly CONFIRM_TEXT: string;
  readonly PENDING_TEXT: string;
}

/** Estado serializável do visualizador aberto (sem objetos gráficos). */
interface ViewerSnapshot {
  camera: CameraState;
  preset: AircraftView | null;
  animating: boolean;
  autoRotate: boolean;
  fullscreen: boolean;
  ready: boolean;
  selection: HierarchyViewState & { tooltip: boolean; raycastReady: boolean };
}

interface CtrlCD3DNamespace {
  math?: MathApi;
  loader?: LoaderApi;
  cameraUtils?: CameraUtilsApi;
  renderer?: RendererApi;
  controls?: ControlsApi;
  viewPresets?: ViewPresetsApi;
  navigation?: NavigationApi;
  regions?: RegionsApi;
  raycaster?: RaycasterApi;
  selection?: SelectionApi;
  panels?: PanelsApi;
  marker?: MarkerApi;
}

interface LocatorOpenOptions {
  /** texto atual de regionSelected (mesmo contrato do localizador 2D) */
  current?: string;
  /** localização estruturada salva no registro (reabrir o 3D restaura o caminho e o ponto) */
  location?: AircraftLocation | null;
  /** recebe o texto de regionSelected (compatível) e, do 3D, o detalhe estruturado */
  onConfirm?: (region: string, detail?: LocationConfirmDetail) => void;
  onClose?: () => void;
}

interface Aircraft3DMetrics {
  bytes: number;
  loadMs: number;
  triangles: number;
  firstFrameMs: number | null;
  downloads: number;
  /** tempo de construção do índice de raycast (0 se já existia na sessão); null até ficar pronto */
  raycastBuildMs: number | null;
  raycastTriangles: number | null;
}

interface CtrlCDAircraft3DApi {
  open(opts?: LocatorOpenOptions): void;
  isSupported(): { ok: boolean; reason: string | null };
  modelUrl(): string;
  readonly lastMetrics: Aircraft3DMetrics | null;
  inspect(): ViewerSnapshot | null;
  pick(clientX: number, clientY: number): PickResult | null;
  readonly version: string;
}

/** Hierarquia compartilhada entre o localizador 2D e o 3D (ctrlcd/aircraft-hierarchy.js). */
interface AircraftHierarchyApi {
  readonly REGIONS: readonly AircraftRegion3D[];
  readonly LEVEL_LABELS: Readonly<Record<RegionLevel, string>>;
  readonly ROOT_ID: string;
  readonly SEPARATOR: string;
  get(id: string): AircraftRegion3D;
  pathOf(id: string): string[];
  isDescendantOf(id: string, ancestorId: string): boolean;
  childrenOf(id: string): AircraftRegion3D[];
  hasChildren(id: string): boolean;
  labelFor(ids: readonly string[]): string;
  pathFromLabel(text: string): string[];
  locationFrom(confirmedPath: readonly string[], o: { view: AircraftView; partial: boolean }): AircraftLocation;
}

interface CtrlCDUIApi {
  h(tag: string, props?: Record<string, unknown> | null, ...kids: unknown[]): HTMLElement;
  icon(name: string, size?: number, className?: string): SVGSVGElement;
  toast(message: string): void;
  trapEscape(onClose: () => void): () => void;
}

interface Window {
  CtrlCD3D: CtrlCD3DNamespace;
  CtrlCDAircraft3D?: CtrlCDAircraft3DApi;
  CtrlCDUI: CtrlCDUIApi;
  CtrlCDAircraftHierarchy?: AircraftHierarchyApi;
  CtrlCDAircraftLocation?: AircraftLocationApi;
  CtrlCDAircraft?: { open(opts: LocatorOpenOptions): void };
  /** false desliga o visualizador 3D sem editar código (volta ao localizador 2D) */
  CTRLCD_3D_ENABLED?: boolean;
}
