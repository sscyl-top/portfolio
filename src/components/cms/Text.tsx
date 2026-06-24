import { getTextContentByKey } from "@/lib/cms/text-content";

type TextProps = {
  k: string
  fallback: string
  className?: string
  as?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'strong' | 'em' | 'a'
  href?: string
}

export async function Text({
  k: textKey,
  fallback,
  className,
  as: Tag = 'span',
  href,
}: TextProps) {
  const { content, styles } = await getTextContentByKey(textKey, fallback)
  const displayContent = content || fallback

  const fontSizeClass = styles.fontSize ?? ''
  const fontWeightClass = styles.fontWeight ?? ''
  const combinedClassName = [className, fontSizeClass, fontWeightClass].filter(Boolean).join(' ')

  const styleObj: React.CSSProperties = {}
  if (styles.fontFamily) styleObj.fontFamily = styles.fontFamily
  if (styles.color) styleObj.color = styles.color

  const dataAttrs: Record<string, string> = {
    'data-text-key': textKey,
  }
  if (styles.fontSize) dataAttrs['data-font-size'] = styles.fontSize
  if (styles.fontFamily) dataAttrs['data-font-family'] = styles.fontFamily
  if (styles.fontWeight) dataAttrs['data-font-weight'] = styles.fontWeight
  if (styles.color) dataAttrs['data-color'] = styles.color

  const linkProps = Tag === 'a' && href ? { href } : {}

  return (
    <Tag className={combinedClassName} style={styleObj} {...dataAttrs} {...linkProps}>
      {displayContent}
    </Tag>
  )
}
