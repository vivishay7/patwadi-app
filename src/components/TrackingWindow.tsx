import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { SimplifiedParcelState } from "../lib/db/types";
import {
  CUSTOMER_STATUS_LABELS,
  TRACKER_STAGE_ORDER,
  formatStatusDate,
  trackerStageIndex,
} from "../lib/domain/customerParcelStatus";
import {
  TIMES,
  TimeOfDay,
  getCelestialSpec,
  getNightStars,
  getTimeOfDay,
  getTrackingCopy,
  resolveSceneForCity,
} from "../lib/domain/trackingScenery";
import colors from "../theme/colors";
import { spacing, radius, typography } from "../constants";

const SCENE_HEIGHT = 250;
const SCENE_WIDTH = 340;

export interface TrackingTimelineStep {
  label: string;
  status: "done" | "current" | "pending";
  timeLabel?: string;
}

interface TrackingWindowProps {
  cityName: string;
  orderId?: string;
  trackingCode?: string;
  parcelState?: SimplifiedParcelState;
  timelineSteps?: TrackingTimelineStep[];
  stageDates?: Partial<Record<SimplifiedParcelState, string>>;
}

interface SceneLayerProps {
  timeOfDay: TimeOfDay;
  cityName: string;
  width: number;
  height: number;
}

function CelestialBody({
  timeOfDay,
  W,
  H,
}: {
  timeOfDay: TimeOfDay;
  W: number;
  H: number;
}) {
  const spec = getCelestialSpec(timeOfDay, W, H);

  if (spec.type === "sun-morning") {
    return (
      <G>
        <Circle cx={spec.cx} cy={spec.cy} r={68} fill="url(#celRadialMorning)" />
        <Circle cx={spec.cx} cy={spec.cy} r={22} fill="#FFEFC2" />
      </G>
    );
  }

  if (spec.type === "sun-afternoon") {
    return (
      <G>
        <Circle cx={spec.cx} cy={spec.cy} r={16} fill="#FFF7DE" />
        <Circle cx={spec.cx} cy={spec.cy} r={27} fill="#FFF7DE" opacity={0.3} />
      </G>
    );
  }

  if (spec.type === "sun-evening") {
    return (
      <G>
        <Circle cx={spec.cx} cy={spec.cy} r={50} fill="url(#celRadialEvening)" />
        <Circle cx={spec.cx} cy={spec.cy} r={17} fill="#FFCB7D" />
      </G>
    );
  }

  return (
    <G>
      <Circle cx={spec.cx} cy={spec.cy} r={34} fill="url(#celRadialNight)" />
      <Circle cx={spec.cx} cy={spec.cy} r={14} fill="#F4EFE0" />
      <Circle
        cx={spec.cx + 4}
        cy={spec.cy - 3}
        r={14}
        fill="#1A1430"
        opacity={0.45}
      />
    </G>
  );
}

function TrackingSceneSvg({ timeOfDay, cityName, width, height }: SceneLayerProps) {
  const time = TIMES[timeOfDay];
  const { resolved } = resolveSceneForCity(cityName);
  const stars = getNightStars();
  const gradientId = `sky-${timeOfDay}`;

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
      preserveAspectRatio="xMidYMid slice"
    >
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          {time.skyStops.map((stop) => (
            <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
          ))}
        </LinearGradient>
        <RadialGradient id="celRadialMorning" cx="50%" cy="50%">
          <Stop offset="0%" stopColor="#FFF3D6" />
          <Stop offset="60%" stopColor="#FFD98A" />
          <Stop offset="100%" stopColor="#FFD98A" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="celRadialEvening" cx="50%" cy="50%">
          <Stop offset="0%" stopColor="#FFD9A0" />
          <Stop offset="100%" stopColor="#FFD9A0" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="celRadialNight" cx="50%" cy="50%">
          <Stop offset="0%" stopColor="#F4EFE0" stopOpacity={0.45} />
          <Stop offset="100%" stopColor="#F4EFE0" stopOpacity={0} />
        </RadialGradient>
      </Defs>

      <Rect width={SCENE_WIDTH} height={SCENE_HEIGHT} fill={`url(#${gradientId})`} />

      {time.starOpacity > 0 &&
        stars.map((star, index) => (
          <Circle
            key={index}
            cx={SCENE_WIDTH * star.x}
            cy={SCENE_HEIGHT * star.y}
            r={star.r}
            fill="#fff"
            opacity={star.opacity * time.starOpacity}
          />
        ))}

      <CelestialBody timeOfDay={timeOfDay} W={SCENE_WIDTH} H={SCENE_HEIGHT} />

      {resolved.scene.renderSkyline(SCENE_WIDTH, SCENE_HEIGHT)}

      <Rect
        width={SCENE_WIDTH}
        height={SCENE_HEIGHT}
        fill={time.tint}
      />
    </Svg>
  );
}

function WindowFrame() {
  return (
    <View style={styles.frameOverlay} pointerEvents="none">
      <View style={styles.paneBorder} />
      <View style={styles.mullionV} />
      <View style={styles.mullionH} />
    </View>
  );
}

function buildDefaultTimeline(
  parcelState: SimplifiedParcelState | undefined,
  stageDates?: Partial<Record<SimplifiedParcelState, string>>
): TrackingTimelineStep[] {
  const currentIndex =
    parcelState && parcelState !== "blocked_exception"
      ? trackerStageIndex(parcelState)
      : 0;

  return TRACKER_STAGE_ORDER.map((stage, index) => {
    const isDone = currentIndex > index;
    const isCurrent = currentIndex === index;
    const date = stageDates?.[stage];

    return {
      label: CUSTOMER_STATUS_LABELS[stage],
      status: isDone ? "done" : isCurrent ? "current" : "pending",
      timeLabel: date
        ? formatStatusDate(date)
        : isDone
          ? "Completed"
          : isCurrent
            ? "In progress"
            : "Pending",
    };
  });
}

export default function TrackingWindow({
  cityName,
  orderId,
  trackingCode,
  parcelState,
  timelineSteps,
  stageDates,
}: TrackingWindowProps) {
  const { width: screenWidth } = useWindowDimensions();
  const windowWidth = Math.min(screenWidth - spacing.xl * 2, SCENE_WIDTH);
  const timeOfDay = getTimeOfDay();
  const time = TIMES[timeOfDay];
  const { displayCity, resolved } = resolveSceneForCity(cityName);
  const copy = getTrackingCopy(timeOfDay, displayCity);

  const timeline =
    timelineSteps ?? buildDefaultTimeline(parcelState, stageDates);

  const sceneKey = useMemo(
    () => `${timeOfDay}:${displayCity}`,
    [timeOfDay, displayCity]
  );

  const [frontLayer, setFrontLayer] = useState<"A" | "B">("A");
  const opacityA = useRef(new Animated.Value(1)).current;
  const opacityB = useRef(new Animated.Value(0)).current;
  const prevKey = useRef(sceneKey);

  useEffect(() => {
    if (prevKey.current === sceneKey) return;
    prevKey.current = sceneKey;

    const backLayer = frontLayer === "A" ? "B" : "A";
    const fadeIn = backLayer === "A" ? opacityA : opacityB;
    const fadeOut = frontLayer === "A" ? opacityA : opacityB;

    fadeIn.setValue(0);
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 850,
        useNativeDriver: true,
      }),
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 850,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setFrontLayer(backLayer);
    });
  }, [sceneKey, frontLayer, opacityA, opacityB]);

  const sceneProps = { timeOfDay, cityName: displayCity, width: windowWidth, height: SCENE_HEIGHT };

  return (
    <View style={styles.card}>
      <View style={[styles.window, { width: windowWidth, height: SCENE_HEIGHT }]}>
        <Animated.View
          style={[
            styles.sceneLayer,
            { opacity: frontLayer === "A" ? opacityA : opacityB },
          ]}
        >
          <TrackingSceneSvg {...sceneProps} />
        </Animated.View>
        <Animated.View
          style={[
            styles.sceneLayer,
            { opacity: frontLayer === "A" ? opacityB : opacityA },
          ]}
        >
          <TrackingSceneSvg {...sceneProps} />
        </Animated.View>

        <WindowFrame />
        <View style={styles.sill} />

        <View style={styles.cityChip}>
          <Text style={styles.cityChipText}>{displayCity}</Text>
        </View>

        <View style={styles.statusChip}>
          <View style={[styles.statusDot, { backgroundColor: time.chipColor }]} />
          <Text style={styles.statusChipText}>{time.statusText}</Text>
        </View>
      </View>

      {(trackingCode || orderId) && (
        <Text style={styles.orderMeta}>
          {trackingCode ?? (orderId ? `Order #${orderId.slice(0, 8)}` : "")} · {displayCity}
        </Text>
      )}

      <View style={styles.updateCopy}>
        <Text style={styles.headline}>{copy.headline}</Text>
        <Text style={styles.subCopy}>{copy.sub}</Text>
      </View>

      <Text style={styles.motif}>{resolved.scene.motif}</Text>

      <View style={styles.timeline}>
        {timeline.map((step, index) => {
          const isActive = step.status === "done" || step.status === "current";
          return (
            <View key={`${step.label}-${index}`} style={styles.stamp}>
              <View style={styles.stampRail}>
                <View
                  style={[
                    styles.stampIcon,
                    step.status === "done" && styles.stampIconDone,
                    step.status === "current" && styles.stampIconCurrent,
                  ]}
                >
                  {step.status === "done" ? (
                    <Text style={styles.stampCheck}>✓</Text>
                  ) : null}
                </View>
                {index < timeline.length - 1 && (
                  <View
                    style={[
                      styles.stampThread,
                      step.status === "done" && styles.stampThreadDone,
                    ]}
                  />
                )}
              </View>
              <View style={styles.stampBody}>
                <Text style={[styles.stampTitle, isActive && styles.stampTitleActive]}>
                  {step.label}
                </Text>
                {step.timeLabel ? (
                  <Text style={[styles.stampTime, isActive && styles.stampTimeActive]}>
                    {step.timeLabel}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      <Text style={styles.hint}>
        Status is derived from custody acknowledgments (code + mandatory photo proof).
      </Text>
    </View>
  );
}

const FRAME_WOOD = "#7A5236";
const FRAME_WOOD_DARK = "#5C3D27";

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.md,
  },
  window: {
    alignSelf: "center",
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#FBF6EE",
    shadowColor: "#241F1C",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  sceneLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  frameOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  paneBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 9,
    borderColor: FRAME_WOOD,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  mullionV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "50%",
    width: 10,
    marginLeft: -5,
    backgroundColor: FRAME_WOOD,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  mullionH: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: 9,
    marginTop: -4.5,
    backgroundColor: FRAME_WOOD_DARK,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  sill: {
    position: "absolute",
    left: -3,
    right: -3,
    bottom: -4,
    height: 14,
    backgroundColor: FRAME_WOOD,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  cityChip: {
    position: "absolute",
    top: 14,
    left: 14,
    zIndex: 5,
    backgroundColor: "rgba(36,31,28,0.45)",
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  cityChipText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: 0.2,
  },
  statusChip: {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 20,
    paddingLeft: 8,
    paddingRight: 12,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 7,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusChipText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#241F1C",
  },
  orderMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },
  updateCopy: {
    gap: 5,
  },
  headline: {
    fontSize: 18.5,
    fontWeight: "500",
    lineHeight: 24,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  subCopy: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  motif: {
    fontSize: 10.5,
    color: "#B5A892",
    fontStyle: "italic",
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    borderStyle: "dashed",
    paddingTop: 7,
  },
  timeline: {
    gap: 0,
  },
  stamp: {
    flexDirection: "row",
    gap: 13,
  },
  stampRail: {
    width: 24,
    alignItems: "center",
  },
  stampIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    backgroundColor: "#FBF6EE",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  stampIconDone: {
    backgroundColor: "#C7491F",
    borderColor: "#C7491F",
  },
  stampIconCurrent: {
    backgroundColor: colors.white,
    borderColor: "#C7491F",
    shadowColor: "#C7491F",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.13,
    shadowRadius: 4,
  },
  stampCheck: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  stampThread: {
    width: 1.5,
    flex: 1,
    backgroundColor: colors.borderLight,
    marginTop: 2,
  },
  stampThreadDone: {
    backgroundColor: "#C7491F",
    opacity: 0.4,
  },
  stampBody: {
    flex: 1,
    paddingBottom: 14,
  },
  stampTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  stampTitleActive: {
    color: colors.textPrimary,
  },
  stampTime: {
    fontSize: 10,
    color: "#B5A892",
    marginTop: 1,
  },
  stampTimeActive: {
    color: colors.textSecondary,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
