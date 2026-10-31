import { useMemo } from "react";
import { View } from "react-native";
import { User } from "phosphor-react-native";
import { SvgXml } from "react-native-svg";
import {
  avatarSvg,
  BASE_BACKGROUND,
  parseAvatarConfig,
} from "@/shared/utils/avatar";

interface NativeAvatarProps {
  name: string;
  size?: number;
  /** Options DiceBear persistées, identiques au web. */
  avatarOptions?: string | null;
}

/** Avatar DiceBear du joueur, sinon silhouette de base sur son fond. */
export function NativeAvatar({
  name,
  size = 40,
  avatarOptions,
}: NativeAvatarProps) {
  const svg = useMemo(() => {
    try {
      return avatarSvg(avatarOptions, name);
    } catch {
      return null;
    }
  }, [avatarOptions, name]);

  if (svg) return <SvgXml xml={svg} width={size} height={size} />;

  const background =
    parseAvatarConfig(avatarOptions)?.backgroundColor ?? BASE_BACKGROUND;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: background,
      }}
    >
      <User size={size * 0.56} color="#3F3F46" weight="fill" />
    </View>
  );
}
