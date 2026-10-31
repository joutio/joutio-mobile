import { View } from "react-native";
import { NativeAvatar } from "@/ui/avatar";
import { tierHex } from "@/ui/tokens";
import { useNativeTheme } from "@/ui/theme";

interface JoEloAvatarProps {
  name: string;
  avatarOptions?: string | null;
  size?: number;
  /** Palier Elo : cadre métal. Sans palier, cadre provisoire en pointillés. */
  tier?: string | null;
}

/** Avatar à initiales cerclé du métal de rang. */
export function JoEloAvatar({
  name,
  avatarOptions,
  size = 44,
  tier,
}: JoEloAvatarProps) {
  const { colors } = useNativeTheme();
  const ring = Math.max(2, Math.round(size * 0.06));
  return (
    <View
      style={{
        width: size,
        height: size,
        padding: ring + 1,
        borderRadius: size / 2,
        borderWidth: ring,
        borderStyle: tier ? "solid" : "dashed",
        borderColor: tier ? tierHex(tier) : colors.border,
      }}
    >
      <NativeAvatar
        name={name}
        avatarOptions={avatarOptions}
        size={size - 2 * (2 * ring + 1)}
      />
    </View>
  );
}
