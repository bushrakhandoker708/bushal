// components/product/DiscountBadge.tsx

interface Props {
  percent: number
}

export default function DiscountBadge({ percent }: Props) {
  return (
    <span className="inline-flex items-center bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
      -{percent}%
    </span>
  )
}