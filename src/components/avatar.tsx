// A profile picture, or a generated fallback when there isn't one. Plain
// <img>, not next/image: the src here can be a data: URL (a user-uploaded
// picture, stored inline — see prisma/schema.prisma's avatarImage comment)
// which next/image's optimizer doesn't handle, and avatars are small enough
// that the optimization wouldn't buy much anyway.
export function Avatar({
  src,
  username,
  size = 56,
  className = "",
}: {
  src: string | null;
  username: string;
  size?: number;
  className?: string;
}) {
  if (src) {
    return (
      <span
        className={`relative flex-shrink-0 overflow-hidden rounded-full border border-line ${className}`}
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }

  return (
    <span
      className={`flex flex-shrink-0 items-center justify-center rounded-full bg-hanko font-display text-paper ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {username.charAt(0).toUpperCase() || "?"}
    </span>
  );
}
