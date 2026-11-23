export const STATUS_LABEL = {
  pending: '待支付',
  preparing: '备餐中',
  ready: '待取餐',
  completed: '已完成',
  refunded: '已退款',
}
export const STATUS_TYPE = {
  pending: 'warning',
  preparing: 'info',
  ready: 'brand',
  completed: 'success',
  refunded: 'sold',
}
const timeFormat = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})
export function formatOrderTime(value) {
  const date = new Date(value)
  return value && Number.isFinite(date.getTime()) ? timeFormat.format(date) : ''
}
