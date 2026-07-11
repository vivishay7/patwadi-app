import { useRef, useCallback } from "react";
import { View, TextInput, StyleSheet, NativeSyntheticEvent, TextInputKeyPressEventData } from "react-native";
import colors from "../theme/colors";
import { spacing, radius } from "../constants";

interface HandoffCodeInputProps {
  value: string;
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
  editable?: boolean;
}

const BOX_COUNT = 4;

function digitsFromValue(value: string): string[] {
  const nums = value.replace(/\D/g, "").slice(0, BOX_COUNT);
  return Array.from({ length: BOX_COUNT }, (_, i) => nums[i] ?? "");
}

export default function HandoffCodeInput({
  value,
  onChange,
  onComplete,
  editable = true,
}: HandoffCodeInputProps) {
  const inputsRef = useRef<(TextInput | null)[]>([]);
  const digits = digitsFromValue(value);

  const emitChange = useCallback(
    (nextDigits: string[]) => {
      const code = nextDigits.join("");
      onChange(code);
      if (code.length === BOX_COUNT && /^\d{4}$/.test(code)) {
        onComplete?.(code);
      }
    },
    [onChange, onComplete]
  );

  const distributePaste = (text: string) => {
    const nums = text.replace(/\D/g, "").slice(0, BOX_COUNT);
    const next = Array.from({ length: BOX_COUNT }, (_, i) => nums[i] ?? "");
    emitChange(next);
    if (nums.length < BOX_COUNT) {
      inputsRef.current[nums.length]?.focus();
    }
  };

  const handleChange = (index: number, text: string) => {
    if (text.length > 1) {
      distributePaste(text);
      return;
    }

    const next = [...digits];
    next[index] = text;
    emitChange(next);

    if (text && index < BOX_COUNT - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    index: number,
    e: NativeSyntheticEvent<TextInputKeyPressEventData>
  ) => {
    if (e.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.row}>
      {digits.map((digit, index) => (
        <TextInput
          key={index}
          ref={(ref) => {
            inputsRef.current[index] = ref;
          }}
          value={digit}
          onChangeText={(t) => handleChange(index, t)}
          onKeyPress={(e) => handleKeyPress(index, e)}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          maxLength={index === 0 ? BOX_COUNT : 1}
          style={styles.box}
          editable={editable}
          selectTextOnFocus
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.md,
  },
  box: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.background,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
  },
});
