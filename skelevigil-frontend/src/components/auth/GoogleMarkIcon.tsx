/**
 * Multicolor “G” mark using Google’s official brand hex values
 * (Blue #4285F4, Red #EA4335, Yellow #FBBC05, Green #34A853).
 * Geometry is a common 48×48 sign-in mark; swap asset if Marketing supplies an approved PNG/SVG.
 */
import Svg, { Path } from 'react-native-svg';

const BLUE = '#4285F4';
const RED = '#EA4335';
const YELLOW = '#FBBC05';
const GREEN = '#34A853';

type Props = {
  size?: number;
};

export function GoogleMarkIcon({ size = 22 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityLabel="Google">
      <Path
        fill={YELLOW}
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <Path
        fill={RED}
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <Path
        fill={GREEN}
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.652-3.342-11.283-8l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
      />
      <Path
        fill={BLUE}
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l0.178,0.14l6.19,5.238C43.068,36.384,44,30.388,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </Svg>
  );
}
