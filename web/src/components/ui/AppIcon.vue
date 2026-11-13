<script>
import {
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Check,
  CircleHelp,
  Utensils,
  Leaf,
  GraduationCap,
  Store,
  UserRound,
  LayoutDashboard,
  SlidersHorizontal,
  ShieldCheck,
  LogOut,
  MapPin,
  Clock3,
  Soup,
  CircleAlert,
  RefreshCw,
  LockKeyhole,
  Phone,
  Heart,
  ShoppingBag,
  CalendarDays,
  CircleUserRound,
  Sun,
  Moon,
} from 'lucide-vue-next'
const icons = {
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Check,
  CircleHelp,
  Utensils,
  Leaf,
  GraduationCap,
  Store,
  UserRound,
  LayoutDashboard,
  SlidersHorizontal,
  ShieldCheck,
  LogOut,
  MapPin,
  Clock3,
  Soup,
  CircleAlert,
  RefreshCw,
  LockKeyhole,
  Phone,
  Heart,
  ShoppingBag,
  CalendarDays,
  CircleUserRound,
  Sun,
  Moon,
}
export default {
  props: {
    name: { type: String, default: 'Leaf' },
    size: { type: [Number, String], default: 20 },
    strokeWidth: { type: Number, default: 1.7 },
  },
  computed: {
    icon() {
      return icons[this.name] || Leaf
    },
  },
}
</script>
<template>
  <component
    :is="icon"
    :size="size"
    :stroke-width="strokeWidth"
    aria-hidden="true"
    focusable="false"
  />
</template>
