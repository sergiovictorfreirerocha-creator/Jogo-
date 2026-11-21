import {
  CheckpointDef,
  CoinDef,
  Difficulty,
  InteractSwitchDef,
  LevelDef,
  ObstacleDef,
  PlatformDef,
  WorldId,
} from '../types/game';

interface LevelBlueprint {
  name: string;
  description: string;
  difficulty: Difficulty;
  parTime: number;
  baseReward: number;
  segments: SegmentKind[];
}

type SegmentKind =
  | 'strides'
  | 'zigzag'
  | 'crouch_bridge'
  | 'moving_x'
  | 'moving_y'
  | 'moving_z'
  | 'vanishing'
  | 'spiral_climb'
  | 'sweeper'
  | 'pendulum'
  | 'bounce'
  | 'narrow'
  | 'gate_switch'
  | 'ice_slide'
  | 'secret_branch';

const DIFF_CONFIG: Record<
  Difficulty,
  {
    gapMin: number;
    gapMax: number;
    stepMax: number;
    widthScale: number;
    speedScale: number;
    stayTime: number;
  }
> = {
  Iniciante: { gapMin: 2.2, gapMax: 2.9, stepMax: 0.9, widthScale: 1.15, speedScale: 0.8, stayTime: 1.6 },
  Fácil: { gapMin: 2.6, gapMax: 3.5, stepMax: 1.3, widthScale: 1.05, speedScale: 0.95, stayTime: 1.35 },
  Intermediário: { gapMin: 3.0, gapMax: 4.2, stepMax: 1.6, widthScale: 0.95, speedScale: 1.1, stayTime: 1.15 },
  Difícil: { gapMin: 3.4, gapMax: 4.9, stepMax: 1.9, widthScale: 0.88, speedScale: 1.3, stayTime: 0.95 },
  Extremo: { gapMin: 3.8, gapMax: 5.5, stepMax: 2.2, widthScale: 0.82, speedScale: 1.5, stayTime: 0.8 },
};

const WORLD_BLUEPRINTS: Record<WorldId, LevelBlueprint[]> = {
  urban: [
    {
      name: 'Telhados do Amanhecer',
      description: 'Aprenda os fundamentos saltando entre coberturas amplas e passarelas metálicas.',
      difficulty: 'Iniciante',
      parTime: 38,
      baseReward: 60,
      segments: ['strides', 'crouch_bridge', 'strides'],
    },
    {
      name: 'Canteiro de Obras',
      description: 'Guindastes em movimento e vigas estreitas ligam os andares em construção.',
      difficulty: 'Fácil',
      parTime: 48,
      baseReward: 85,
      segments: ['strides', 'moving_x', 'narrow', 'secret_branch'],
    },
    {
      name: 'Ponte dos Arranha-Céus',
      description: 'Ative o painel da passarela suspensa e escale a torre de ventilação.',
      difficulty: 'Intermediário',
      parTime: 58,
      baseReward: 115,
      segments: ['zigzag', 'gate_switch', 'spiral_climb', 'crouch_bridge'],
    },
    {
      name: 'Horizonte Vertical',
      description: 'Plataformas elevatórias, hélices giratórias e saltos cronometrados sobre a avenida.',
      difficulty: 'Difícil',
      parTime: 70,
      baseReward: 150,
      segments: ['moving_y', 'sweeper', 'vanishing', 'bounce', 'narrow'],
    },
    {
      name: 'Topo da Metrópole',
      description: 'O percurso urbano definitivo pelos arranha-céus mais altos da cidade.',
      difficulty: 'Extremo',
      parTime: 85,
      baseReward: 210,
      segments: ['narrow', 'moving_z', 'sweeper', 'vanishing', 'spiral_climb', 'secret_branch'],
    },
  ],
  forest: [
    {
      name: 'Trilha das Copas',
      description: 'Salte entre plataformas de madeira e troncos caídos na entrada da floresta.',
      difficulty: 'Iniciante',
      parTime: 40,
      baseReward: 70,
      segments: ['strides', 'bounce', 'strides'],
    },
    {
      name: 'Cogumelos Saltitantes',
      description: 'Use cogumelos gigantes elásticos para alcançar galhos elevados.',
      difficulty: 'Fácil',
      parTime: 50,
      baseReward: 95,
      segments: ['zigzag', 'bounce', 'crouch_bridge', 'secret_branch'],
    },
    {
      name: 'Ponte das Árvores Ancestrais',
      description: 'Pontes suspensas balançantes e galhos estreitos sobre o vale enevoado.',
      difficulty: 'Intermediário',
      parTime: 62,
      baseReward: 125,
      segments: ['narrow', 'moving_x', 'spiral_climb', 'pendulum'],
    },
    {
      name: 'Santuário Oculto',
      description: 'Folhagens instáveis que desaparecem e um portão antigo na floresta profunda.',
      difficulty: 'Difícil',
      parTime: 74,
      baseReward: 165,
      segments: ['vanishing', 'gate_switch', 'bounce', 'sweeper', 'secret_branch'],
    },
    {
      name: 'Coração da Selva Mística',
      description: 'Escale a árvore colossal superando troncos giratórios e pontes partidas.',
      difficulty: 'Extremo',
      parTime: 88,
      baseReward: 225,
      segments: ['spiral_climb', 'vanishing', 'moving_z', 'pendulum', 'narrow', 'bounce'],
    },
  ],
  volcanic: [
    {
      name: 'Margem de Basalto',
      description: 'Primeiros saltos sobre rochas negras acima do lago de magma brilhante.',
      difficulty: 'Iniciante',
      parTime: 42,
      baseReward: 80,
      segments: ['strides', 'moving_x', 'strides'],
    },
    {
      name: 'Gêiseres Ardentes',
      description: 'Aproveite jatos térmicos para cruzar precipícios incandescentes.',
      difficulty: 'Fácil',
      parTime: 52,
      baseReward: 105,
      segments: ['zigzag', 'bounce', 'vanishing', 'secret_branch'],
    },
    {
      name: 'Rios de Magma',
      description: 'Jangadas vulcânicas móveis e barreiras de fogo em sequência intensa.',
      difficulty: 'Intermediário',
      parTime: 64,
      baseReward: 135,
      segments: ['moving_z', 'sweeper', 'crouch_bridge', 'moving_y'],
    },
    {
      name: 'Cratera Instável',
      description: 'Rochas que afundam rapidamente e pêndulos flamejantes exigem precisão.',
      difficulty: 'Difícil',
      parTime: 76,
      baseReward: 180,
      segments: ['vanishing', 'pendulum', 'gate_switch', 'narrow', 'bounce'],
    },
    {
      name: 'Fúria do Vulcão',
      description: 'Ascensão extrema até o pico em erupção entre plataformas móveis e chamas.',
      difficulty: 'Extremo',
      parTime: 92,
      baseReward: 245,
      segments: ['spiral_climb', 'sweeper', 'vanishing', 'moving_x', 'pendulum', 'secret_branch'],
    },
  ],
  frozen: [
    {
      name: 'Lago Cristalino',
      description: 'Sinta a inércia das plataformas de gelo polido controlando sua frenagem.',
      difficulty: 'Iniciante',
      parTime: 42,
      baseReward: 90,
      segments: ['ice_slide', 'strides', 'ice_slide'],
    },
    {
      name: 'Pontes da Geada',
      description: 'Curvas escorregadias combinadas com blocos de neve fofa e rampas.',
      difficulty: 'Fácil',
      parTime: 54,
      baseReward: 115,
      segments: ['ice_slide', 'zigzag', 'crouch_bridge', 'secret_branch'],
    },
    {
      name: 'Torre de Cristal',
      description: 'Estalactites de gelo que quebram sob os pés e elevadores congelados.',
      difficulty: 'Intermediário',
      parTime: 66,
      baseReward: 145,
      segments: ['vanishing', 'moving_y', 'ice_slide', 'sweeper'],
    },
    {
      name: 'Desfiladeiro Ártico',
      description: 'Ative o cristal da ponte glacial e cruze passarelas estreitas no vento forte.',
      difficulty: 'Difícil',
      parTime: 78,
      baseReward: 190,
      segments: ['narrow', 'gate_switch', 'ice_slide', 'pendulum', 'bounce'],
    },
    {
      name: 'Trono do Inverno Eterno',
      description: 'Desafio glacial extremo misturando gelo deslizante e plataformas efêmeras.',
      difficulty: 'Extremo',
      parTime: 95,
      baseReward: 260,
      segments: ['ice_slide', 'vanishing', 'moving_z', 'sweeper', 'spiral_climb', 'narrow'],
    },
  ],
  cyberpunk: [
    {
      name: 'Distrito Neon',
      description: 'Entre na matriz urbana entre plataformas holográficas e painéis luminosos.',
      difficulty: 'Iniciante',
      parTime: 42,
      baseReward: 100,
      segments: ['strides', 'crouch_bridge', 'bounce'],
    },
    {
      name: 'Passarela Holográfica',
      description: 'Desvie de barreiras laser baixas agachando no momento exato.',
      difficulty: 'Fácil',
      parTime: 54,
      baseReward: 125,
      segments: ['crouch_bridge', 'moving_x', 'zigzag', 'secret_branch'],
    },
    {
      name: 'Servidor Central',
      description: 'Hackeie o terminal para liberar a ponte digital e suba o núcleo de dados.',
      difficulty: 'Intermediário',
      parTime: 66,
      baseReward: 160,
      segments: ['gate_switch', 'spiral_climb', 'sweeper', 'vanishing'],
    },
    {
      name: 'Autoestrada de Dados',
      description: 'Propulsores quânticos, plataformas sincronizadas e varredores laser duplos.',
      difficulty: 'Difícil',
      parTime: 80,
      baseReward: 205,
      segments: ['bounce', 'moving_z', 'crouch_bridge', 'sweeper', 'narrow'],
    },
    {
      name: 'Núcleo Cyber-Zero',
      description: 'Velocidade máxima e reflexos puros no topo da megacorporação neon.',
      difficulty: 'Extremo',
      parTime: 96,
      baseReward: 280,
      segments: ['narrow', 'vanishing', 'moving_y', 'sweeper', 'crouch_bridge', 'secret_branch'],
    },
  ],
  desert: [
    {
      name: 'Dunas Douradas',
      description: 'Salte entre blocos de arenito antigos sob o sol escaldante do oásis.',
      difficulty: 'Iniciante',
      parTime: 44,
      baseReward: 110,
      segments: ['strides', 'zigzag', 'strides'],
    },
    {
      name: 'Templo do Escaravelho',
      description: 'Corredores baixos de pedra e passagens secretas com tesouros antigos.',
      difficulty: 'Fácil',
      parTime: 56,
      baseReward: 135,
      segments: ['crouch_bridge', 'secret_branch', 'moving_x', 'bounce'],
    },
    {
      name: 'Obeliscos Suspensos',
      description: 'Pêndulos de bronze e plataformas que afundam nas ruínas suspensas.',
      difficulty: 'Intermediário',
      parTime: 68,
      baseReward: 170,
      segments: ['pendulum', 'vanishing', 'spiral_climb', 'narrow'],
    },
    {
      name: 'Câmara dos Faraós',
      description: 'Ative o altar antigo para estender a ponte sagrada sobre o abismo.',
      difficulty: 'Difícil',
      parTime: 82,
      baseReward: 220,
      segments: ['gate_switch', 'sweeper', 'moving_z', 'pendulum', 'vanishing'],
    },
    {
      name: 'Pirâmide Celestial',
      description: 'Escale o topo da pirâmide dourada superando todas as armadilhas milenares.',
      difficulty: 'Extremo',
      parTime: 98,
      baseReward: 300,
      segments: ['spiral_climb', 'narrow', 'pendulum', 'vanishing', 'moving_y', 'secret_branch'],
    },
  ],
  space: [
    {
      name: 'Doca de Desembarque',
      description: 'Experimente a baixa gravidade realizando saltos longos e suaves no espaço.',
      difficulty: 'Iniciante',
      parTime: 45,
      baseReward: 120,
      segments: ['strides', 'bounce', 'strides'],
    },
    {
      name: 'Anel de Satélites',
      description: 'Plataformas orbitais móveis e dutos de manutenção de baixa altitude.',
      difficulty: 'Fácil',
      parTime: 56,
      baseReward: 150,
      segments: ['moving_x', 'crouch_bridge', 'zigzag', 'secret_branch'],
    },
    {
      name: 'Reator de Antimatéria',
      description: 'Campos de energia instáveis e eixos rotativos em gravidade reduzida.',
      difficulty: 'Intermediário',
      parTime: 70,
      baseReward: 185,
      segments: ['vanishing', 'sweeper', 'moving_y', 'gate_switch'],
    },
    {
      name: 'Ponte Interestelar',
      description: 'Vigas estreitas flutuando no vácuo com propulsores de longo alcance.',
      difficulty: 'Difícil',
      parTime: 84,
      baseReward: 240,
      segments: ['narrow', 'bounce', 'moving_z', 'pendulum', 'vanishing'],
    },
    {
      name: 'Órbita Suprema',
      description: 'O teste definitivo entre asteroides e módulos espaciais em alta órbita.',
      difficulty: 'Extremo',
      parTime: 100,
      baseReward: 325,
      segments: ['spiral_climb', 'moving_z', 'sweeper', 'vanishing', 'narrow', 'secret_branch'],
    },
  ],
  medieval: [
    {
      name: 'Ponte Levadiça',
      description: 'Aproxime-se das muralhas do castelo cruzando pontes de carvalho antigas.',
      difficulty: 'Iniciante',
      parTime: 46,
      baseReward: 130,
      segments: ['strides', 'crouch_bridge', 'zigzag'],
    },
    {
      name: 'Muralha dos Guardas',
      description: 'Ameias estreitas e mecanismos giratórios protegem o pátio interno.',
      difficulty: 'Fácil',
      parTime: 58,
      baseReward: 160,
      segments: ['narrow', 'sweeper', 'bounce', 'secret_branch'],
    },
    {
      name: 'Torre do Sino',
      description: 'Subida em espiral pelas escadarias externas até o campanário real.',
      difficulty: 'Intermediário',
      parTime: 72,
      baseReward: 200,
      segments: ['spiral_climb', 'pendulum', 'moving_y', 'vanishing'],
    },
    {
      name: 'Masmorra Suspensa',
      description: 'Liberte a corrente da ponte levadiça secreta e atravesse plataformas móveis.',
      difficulty: 'Difícil',
      parTime: 86,
      baseReward: 260,
      segments: ['gate_switch', 'vanishing', 'moving_x', 'sweeper', 'narrow'],
    },
    {
      name: 'Cidadela do Rei',
      description: 'A fase final de Hora do Parkour! Conquiste a coroa no topo do castelo.',
      difficulty: 'Extremo',
      parTime: 105,
      baseReward: 400,
      segments: ['narrow', 'sweeper', 'vanishing', 'moving_z', 'pendulum', 'spiral_climb', 'secret_branch'],
    },
  ],
};

// Seeded PRNG so every level layout is 100% deterministic and reproducible
function makeRng(seedStr: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildLevelFromBlueprint(
  worldId: WorldId,
  levelNumber: number,
  bp: LevelBlueprint
): LevelDef {
  const id = `${worldId}-${levelNumber}`;
  const rng = makeRng(id);
  const cfg = DIFF_CONFIG[bp.difficulty];
  const isSpace = worldId === 'space';
  const gapMult = isSpace ? 1.18 : 1.0;

  const platforms: PlatformDef[] = [];
  const obstacles: ObstacleDef[] = [];
  const coins: CoinDef[] = [];
  const checkpoints: CheckpointDef[] = [];
  const switches: InteractSwitchDef[] = [];

  let pIdx = 0;
  let oIdx = 0;
  let cIdx = 0;
  let cpIdx = 0;
  let swIdx = 0;

  const nextGap = (extra = 0) =>
    (cfg.gapMin + rng() * (cfg.gapMax - cfg.gapMin) + extra) * gapMult;
  const nextStep = (maxScale = 1) =>
    Math.round((0.3 + rng() * cfg.stepMax * maxScale) * 10) / 10;

  // Start platform
  const startW = 6.5;
  const startD = 6.5;
  let curX = 0;
  let curY = 0;
  let curZ = 0;
  let minY = 0;

  platforms.push({
    id: `${id}-p${pIdx++}`,
    x: curX,
    y: curY - 0.5,
    z: curZ,
    w: startW,
    h: 1.0,
    d: startD,
    kind: 'normal',
  });

  // Track front edge Z
  let frontZ = curZ - startD / 2;

  const addCoin = (x: number, y: number, z: number, value = 5, isSecret = false) => {
    coins.push({
      id: `${id}-c${cIdx++}`,
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      z: Math.round(z * 100) / 100,
      value,
      isSecret,
    });
  };

  const addCheckpointPad = (x: number, y: number, z: number) => {
    const w = 4.6;
    const d = 4.6;
    platforms.push({
      id: `${id}-p${pIdx++}`,
      x,
      y: y - 0.45,
      z: z - d / 2,
      w,
      h: 0.9,
      d,
      kind: 'normal',
      isCheckpointBase: true,
    });
    checkpoints.push({
      id: `${id}-cp${cpIdx}`,
      index: cpIdx + 1,
      x,
      y,
      z: z - d / 2,
    });
    cpIdx++;
    curX = x;
    curY = y;
    frontZ = z - d;
    minY = Math.min(minY, y);
  };

  const totalSegs = bp.segments.length;
  // Place checkpoints cleanly between major segments (1 to 3 checkpoints depending on level length)
  const checkpointAfterSet = new Set<number>();
  if (totalSegs >= 3) {
    checkpointAfterSet.add(Math.floor(totalSegs / 2) - 1);
  }
  if (totalSegs >= 5) {
    checkpointAfterSet.add(1);
    checkpointAfterSet.add(totalSegs - 2);
  }

  bp.segments.forEach((seg, segIndex) => {
    switch (seg) {
      case 'strides': {
        const count = 3;
        for (let i = 0; i < count; i++) {
          const gap = nextGap();
          const dy = i % 2 === 0 ? nextStep(0.75) : -0.2;
          const dx = (rng() - 0.5) * 3.4;
          const w = Math.max(2.6, 3.8 * cfg.widthScale);
          const d = 3.8 + rng() * 1.2;
          curX += dx;
          curY += dy;
          const centerZ = frontZ - gap - d / 2;
          platforms.push({
            id: `${id}-p${pIdx++}`,
            x: curX,
            y: curY - 0.4,
            z: centerZ,
            w,
            h: 0.8,
            d,
            kind: worldId === 'frozen' && i === 1 ? 'ice' : 'normal',
          });
          addCoin(curX, curY + 1.1, centerZ, 5);
          frontZ = centerZ - d / 2;
          minY = Math.min(minY, curY);
        }
        break;
      }

      case 'zigzag': {
        const count = 4;
        const dirSign = rng() > 0.5 ? 1 : -1;
        for (let i = 0; i < count; i++) {
          const gap = nextGap(-0.3);
          const dx = dirSign * (i % 2 === 0 ? 3.2 : -3.2);
          const dy = nextStep(0.65);
          const w = Math.max(2.4, 3.2 * cfg.widthScale);
          const d = 3.2;
          curX += dx;
          curY += dy;
          const centerZ = frontZ - gap - d / 2;
          platforms.push({
            id: `${id}-p${pIdx++}`,
            x: curX,
            y: curY - 0.4,
            z: centerZ,
            w,
            h: 0.8,
            d,
            kind: 'normal',
          });
          addCoin(curX, curY + 1.15, centerZ, 5);
          frontZ = centerZ - d / 2;
          minY = Math.min(minY, curY);
        }
        break;
      }

      case 'crouch_bridge': {
        const gap = nextGap(-0.3);
        const w = Math.max(3.2, 4.0 * cfg.widthScale);
        const d = 11.5;
        const centerZ = frontZ - gap - d / 2;
        curY += nextStep(0.4);
        platforms.push({
          id: `${id}-p${pIdx++}`,
          x: curX,
          y: curY - 0.35,
          z: centerZ,
          w,
          h: 0.7,
          d,
          kind: 'bridge',
        });
        // Two crouch beams along the bridge! Bottom at curY + 1.22 so standing (1.8) hits, crouching (1.05) clears!
        for (let b = 0; b < 2; b++) {
          const bz = centerZ + (b === 0 ? 2.4 : -2.6);
          obstacles.push({
            id: `${id}-o${oIdx++}`,
            x: curX,
            y: curY + 1.97,
            z: bz,
            w: w + 0.4,
            h: 1.5,
            d: 0.7,
            kind: worldId === 'cyberpunk' || worldId === 'space' ? 'laser_bar' : 'crouch_beam',
            lethal: false,
          });
          // Coin tucked underneath to reward crouching!
          addCoin(curX, curY + 0.65, bz, 8);
        }
        frontZ = centerZ - d / 2;
        minY = Math.min(minY, curY);
        break;
      }

      case 'moving_x': {
        const gap = nextGap(-0.2);
        const w = Math.max(2.8, 3.5 * cfg.widthScale);
        const d = 3.5;
        for (let i = 0; i < 2; i++) {
          const centerZ = frontZ - gap - d / 2;
          const phase = i * Math.PI;
          platforms.push({
            id: `${id}-p${pIdx++}`,
            x: curX,
            y: curY - 0.35,
            z: centerZ,
            w,
            h: 0.7,
            d,
            kind: 'moving',
            moveAxis: 'x',
            moveRange: 3.4,
            moveSpeed: 1.25 * cfg.speedScale,
            movePhase: phase,
          });
          addCoin(curX, curY + 1.25, centerZ, 10);
          frontZ = centerZ - d / 2;
        }
        break;
      }

      case 'moving_z': {
        const gap = 2.4;
        const w = Math.max(2.9, 3.6 * cfg.widthScale);
        const d = 3.8;
        const moveRange = 3.0;
        const centerZ = frontZ - gap - moveRange - d / 2;
        platforms.push({
          id: `${id}-p${pIdx++}`,
          x: curX,
          y: curY - 0.35,
          z: centerZ,
          w,
          h: 0.7,
          d,
          kind: 'moving',
          moveAxis: 'z',
          moveRange,
          moveSpeed: 1.15 * cfg.speedScale,
          movePhase: rng() * Math.PI,
        });
        addCoin(curX, curY + 1.2, centerZ, 10);
        frontZ = centerZ - moveRange - d / 2 + 1.2;
        break;
      }

      case 'moving_y': {
        const gap = nextGap(-0.4);
        const w = 3.6;
        const d = 3.6;
        const centerZ = frontZ - gap - d / 2;
        const lift = 2.6;
        platforms.push({
          id: `${id}-p${pIdx++}`,
          x: curX,
          y: curY + lift * 0.5 - 0.35,
          z: centerZ,
          w,
          h: 0.7,
          d,
          kind: 'moving',
          moveAxis: 'y',
          moveRange: lift * 0.5,
          moveSpeed: 1.2 * cfg.speedScale,
          movePhase: 0,
        });
        addCoin(curX, curY + lift + 1.1, centerZ, 10);
        curY += lift;
        frontZ = centerZ - d / 2;
        // Landing ledge at top
        const topGap = 2.4;
        const topD = 3.8;
        const topZ = frontZ - topGap - topD / 2;
        platforms.push({
          id: `${id}-p${pIdx++}`,
          x: curX,
          y: curY - 0.4,
          z: topZ,
          w: 3.8,
          h: 0.8,
          d: topD,
          kind: 'normal',
        });
        frontZ = topZ - topD / 2;
        break;
      }

      case 'vanishing': {
        const count = 3;
        for (let i = 0; i < count; i++) {
          const gap = nextGap(-0.3);
          const dx = (i % 2 === 0 ? 1 : -1) * 1.4;
          curX += dx;
          curY += nextStep(0.45);
          const w = Math.max(2.6, 3.2 * cfg.widthScale);
          const d = 3.1;
          const centerZ = frontZ - gap - d / 2;
          platforms.push({
            id: `${id}-p${pIdx++}`,
            x: curX,
            y: curY - 0.35,
            z: centerZ,
            w,
            h: 0.7,
            d,
            kind: 'disappearing',
            stayTime: cfg.stayTime,
            respawnTime: 2.2,
          });
          addCoin(curX, curY + 1.15, centerZ, 10);
          frontZ = centerZ - d / 2;
          minY = Math.min(minY, curY);
        }
        break;
      }

      case 'spiral_climb': {
        // 4 ascending platforms spiraling cleanly around a central column
        const radius = 3.2;
        const baseX = curX;
        const baseZ = frontZ - 5.2;
        // Central decorative tower core (also solid!)
        platforms.push({
          id: `${id}-p${pIdx++}`,
          x: baseX,
          y: curY + 3.0,
          z: baseZ,
          w: 2.6,
          h: 8.5,
          d: 2.6,
          kind: 'climb',
        });
        const angles = [Math.PI * 0.55, Math.PI * 0.15, -Math.PI * 0.2, -Math.PI * 0.52];
        for (let s = 0; s < 4; s++) {
          curY += 1.55;
          const a = angles[s];
          const lx = baseX + Math.cos(a) * radius;
          const lz = baseZ + Math.sin(a) * radius;
          platforms.push({
            id: `${id}-p${pIdx++}`,
            x: lx,
            y: curY - 0.35,
            z: lz,
            w: 3.1,
            h: 0.7,
            d: 3.1,
            kind: 'climb',
          });
          addCoin(lx, curY + 1.1, lz, 8);
          curX = lx;
          frontZ = lz - 1.55;
        }
        // Exit platform straight ahead from top
        const exitGap = 2.4;
        const exitD = 3.8;
        const exitZ = baseZ - radius - exitGap - exitD / 2;
        curX = baseX;
        platforms.push({
          id: `${id}-p${pIdx++}`,
          x: curX,
          y: curY - 0.4,
          z: exitZ,
          w: 4.0,
          h: 0.8,
          d: exitD,
          kind: 'normal',
        });
        frontZ = exitZ - exitD / 2;
        break;
      }

      case 'sweeper': {
        const gap = nextGap(-0.2);
        const w = 5.4;
        const d = 6.2;
        const centerZ = frontZ - gap - d / 2;
        platforms.push({
          id: `${id}-p${pIdx++}`,
          x: curX,
          y: curY - 0.4,
          z: centerZ,
          w,
          h: 0.8,
          d,
          kind: 'normal',
        });
        obstacles.push({
          id: `${id}-o${oIdx++}`,
          x: curX,
          y: curY + 0.65,
          z: centerZ,
          w: 5.2,
          h: 0.55,
          d: 0.55,
          kind: 'rotator',
          speed: 1.65 * cfg.speedScale,
          phase: rng() * Math.PI,
          lethal: false,
        });
        addCoin(curX - 1.5, curY + 1.2, centerZ, 8);
        addCoin(curX + 1.5, curY + 1.2, centerZ, 8);
        frontZ = centerZ - d / 2;
        break;
      }

      case 'pendulum': {
        const gap = nextGap(-0.3);
        const w = 4.2;
        const d = 9.0;
        const centerZ = frontZ - gap - d / 2;
        platforms.push({
          id: `${id}-p${pIdx++}`,
          x: curX,
          y: curY - 0.4,
          z: centerZ,
          w,
          h: 0.8,
          d,
          kind: 'bridge',
        });
        obstacles.push({
          id: `${id}-o${oIdx++}`,
          x: curX,
          y: curY + 1.0,
          z: centerZ,
          w: 1.3,
          h: 1.3,
          d: 1.3,
          kind: 'pendulum',
          speed: 2.0 * cfg.speedScale,
          range: 2.3,
          phase: rng() * Math.PI,
          lethal: false,
        });
        addCoin(curX, curY + 1.2, centerZ + 2.2, 8);
        addCoin(curX, curY + 1.2, centerZ - 2.2, 8);
        frontZ = centerZ - d / 2;
        break;
      }

      case 'bounce': {
        const gap = nextGap(-0.3);
        const padD = 3.2;
        const padZ = frontZ - gap - padD / 2;
        platforms.push({
          id: `${id}-p${pIdx++}`,
          x: curX,
          y: curY - 0.35,
          z: padZ,
          w: 3.4,
          h: 0.7,
          d: padD,
          kind: 'bounce',
          bounceForce: isSpace ? 15.5 : 19.5,
        });
        // Arc coins
        addCoin(curX, curY + 3.2, padZ - 2.2, 5);
        addCoin(curX, curY + 4.4, padZ - 4.2, 10);
        // High landing deck
        curY += 3.6;
        const landD = 4.4;
        const landZ = padZ - 5.6 - landD / 2;
        platforms.push({
          id: `${id}-p${pIdx++}`,
          x: curX,
          y: curY - 0.4,
          z: landZ,
          w: 4.5,
          h: 0.8,
          d: landD,
          kind: 'normal',
        });
        frontZ = landZ - landD / 2;
        break;
      }

      case 'narrow': {
        const gap = nextGap(-0.4);
        const d1 = 6.2;
        const z1 = frontZ - gap - d1 / 2;
        platforms.push({
          id: `${id}-p${pIdx++}`,
          x: curX,
          y: curY - 0.35,
          z: z1,
          w: Math.max(1.25, 1.55 * cfg.widthScale),
          h: 0.7,
          d: d1,
          kind: 'narrow',
        });
        addCoin(curX, curY + 1.05, z1 + 1.4, 8);
        addCoin(curX, curY + 1.05, z1 - 1.4, 8);
        // Angled second beam
        const z2 = z1 - d1 / 2 - 2.3 - 2.6;
        curX += rng() > 0.5 ? 1.8 : -1.8;
        platforms.push({
          id: `${id}-p${pIdx++}`,
          x: curX,
          y: curY - 0.35,
          z: z2,
          w: Math.max(1.25, 1.5 * cfg.widthScale),
          h: 0.7,
          d: 5.2,
          kind: 'narrow',
        });
        addCoin(curX, curY + 1.05, z2, 10);
        frontZ = z2 - 2.6;
        break;
      }

      case 'gate_switch': {
        const gap = nextGap(-0.3);
        const deckD = 4.6;
        const deckZ = frontZ - gap - deckD / 2;
        platforms.push({
          id: `${id}-p${pIdx++}`,
          x: curX,
          y: curY - 0.4,
          z: deckZ,
          w: 5.0,
          h: 0.8,
          d: deckD,
          kind: 'normal',
        });
        const switchId = `${id}-sw${swIdx++}`;
        switches.push({
          id: switchId,
          x: curX + 1.6,
          y: curY,
          z: deckZ,
          label: 'Ativar Ponte',
        });
        // Gate bridge across wide chasm (stays inactive until switch pressed with E)
        const bridgeD = 6.8;
        const bridgeZ = deckZ - deckD / 2 - 1.6 - bridgeD / 2;
        platforms.push({
          id: `${id}-p${pIdx++}`,
          x: curX,
          y: curY - 0.3,
          z: bridgeZ,
          w: 3.2,
          h: 0.6,
          d: bridgeD,
          kind: 'gate_bridge',
          switchId,
        });
        addCoin(curX, curY + 1.1, bridgeZ, 15);
        frontZ = bridgeZ - bridgeD / 2;
        break;
      }

      case 'ice_slide': {
        const gap = nextGap(-0.3);
        const w = 4.0;
        const d = 8.5;
        const centerZ = frontZ - gap - d / 2;
        platforms.push({
          id: `${id}-p${pIdx++}`,
          x: curX,
          y: curY - 0.4,
          z: centerZ,
          w,
          h: 0.8,
          d,
          kind: 'ice',
        });
        addCoin(curX - 0.8, curY + 1.1, centerZ + 1.8, 5);
        addCoin(curX + 0.8, curY + 1.1, centerZ - 1.8, 5);
        frontZ = centerZ - d / 2;
        break;
      }

      case 'secret_branch': {
        // Main path ahead + secret side platform with 25-coin treasure!
        const gap = nextGap(-0.3);
        const d = 4.2;
        const mainZ = frontZ - gap - d / 2;
        platforms.push({
          id: `${id}-p${pIdx++}`,
          x: curX,
          y: curY - 0.4,
          z: mainZ,
          w: 3.6,
          h: 0.8,
          d,
          kind: 'normal',
        });
        const sideDir = rng() > 0.5 ? 1 : -1;
        const secretX = curX + sideDir * 5.2;
        platforms.push({
          id: `${id}-p${pIdx++}`,
          x: secretX,
          y: curY + 0.5,
          z: mainZ,
          w: 2.8,
          h: 0.7,
          d: 2.8,
          kind: 'normal',
        });
        addCoin(secretX, curY + 1.8, mainZ, 25, true);
        addCoin(secretX, curY + 1.8, mainZ - 0.8, 15, true);
        frontZ = mainZ - d / 2;
        break;
      }
    }

    if (checkpointAfterSet.has(segIndex)) {
      const cpGap = 2.6;
      addCheckpointPad(curX, curY, frontZ - cpGap);
    }
  });

  // Final Finish Platform
  const finGap = 2.8;
  const finW = 6.5;
  const finD = 6.5;
  const finZ = frontZ - finGap - finD / 2;
  platforms.push({
    id: `${id}-p${pIdx++}`,
    x: curX,
    y: curY - 0.5,
    z: finZ,
    w: finW,
    h: 1.0,
    d: finD,
    kind: 'normal',
  });
  addCoin(curX - 1.2, curY + 1.2, finZ + 1.2, 10);
  addCoin(curX + 1.2, curY + 1.2, finZ + 1.2, 10);

  return {
    id,
    worldId,
    levelNumber,
    name: bp.name,
    description: bp.description,
    difficulty: bp.difficulty,
    parTime: bp.parTime,
    baseReward: bp.baseReward,
    fallLimitY: minY - 12,
    startPos: { x: 0, y: 0.2, z: 0 },
    finishPos: { x: curX, y: curY, z: finZ - 0.6 },
    platforms,
    obstacles,
    coins,
    checkpoints,
    switches,
  };
}

export const LEVELS: LevelDef[] = (Object.keys(WORLD_BLUEPRINTS) as WorldId[]).flatMap(
  (worldId) =>
    WORLD_BLUEPRINTS[worldId].map((bp, idx) =>
      buildLevelFromBlueprint(worldId, idx + 1, bp)
    )
);

export function getLevelsByWorld(worldId: WorldId): LevelDef[] {
  return LEVELS.filter((l) => l.worldId === worldId);
}

export function getLevelById(levelId: string): LevelDef | undefined {
  return LEVELS.find((l) => l.id === levelId);
}

export function getNextLevelInWorld(levelId: string): LevelDef | undefined {
  const current = getLevelById(levelId);
  if (!current) return undefined;
  return LEVELS.find(
    (l) => l.worldId === current.worldId && l.levelNumber === current.levelNumber + 1
  );
}
