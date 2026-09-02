import { cn } from "../../lib/utils";
import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: {
    value: number;
    type: "increase" | "decrease";
  };
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  change,
  className,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className={cn(
        "bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl relative rounded-2xl overflow-hidden p-6",
        className,
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-blue-200">{title}</h3>
        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-300">
          {icon}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-3xl font-semibold tracking-tight text-white">
          {value}
        </p>

        {change && (
          <div className="flex items-center space-x-2">
            <span
              className={cn(
                "text-xs font-medium",
                change.type === "increase" ? "text-green-400" : "text-red-400",
              )}
            >
              {change.type === "increase" ? "+" : "-"}
              {Math.abs(change.value)}%
            </span>
            <span className="text-xs text-blue-200">from last month</span>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 right-0 w-24 h-24 -mr-6 -mb-6 rounded-full opacity-10 bg-blue-400"></div>
    </motion.div>
  );
};

export default StatCard;
