export function campusGreeting(date = new Date()) {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    hour: 'numeric',
    hourCycle: 'h23',
    timeZone: 'Asia/Shanghai',
  }).formatToParts(date)
  const hour = Number(parts.find((part) => part.type === 'hour').value)
  return {
    text:
      hour < 5
        ? '夜深了'
        : hour < 11
          ? '早上好'
          : hour < 14
            ? '中午好'
            : hour < 18
              ? '下午好'
              : '晚上好',
    icon: hour >= 18 || hour < 5 ? 'Moon' : 'Sun',
  }
}
