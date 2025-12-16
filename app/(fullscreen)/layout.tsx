export default function FullscreenLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Layout sem sidebar/menu - totalmente limpo para WhatsApp fullscreen
  return <>{children}</>
}

