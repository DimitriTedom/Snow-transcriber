import { toast, type Id, type ToastOptions } from "react-toastify";

export const NOTIFY_DURATION = {
  short: 3000,
  default: 5000,
  long: 10000,
} as const;

type NotifyOptions = ToastOptions;

function withDuration(autoClose: number | false, options?: NotifyOptions): NotifyOptions {
  return {
    ...options,
    autoClose: options?.autoClose ?? autoClose,
  };
}

export const notify = {
  success(message: string, options?: NotifyOptions) {
    return toast.success(message, withDuration(NOTIFY_DURATION.short, options));
  },

  error(message: string, options?: NotifyOptions) {
    return toast.error(message, withDuration(NOTIFY_DURATION.long, options));
  },

  warning(message: string, options?: NotifyOptions) {
    return toast.warning(message, withDuration(NOTIFY_DURATION.long, options));
  },

  info(message: string, options?: NotifyOptions) {
    return toast.info(message, withDuration(NOTIFY_DURATION.default, options));
  },

  message(message: string, options?: NotifyOptions) {
    return toast.info(message, withDuration(NOTIFY_DURATION.default, options));
  },

  loading(message: string, options?: NotifyOptions) {
    return toast.loading(message, withDuration(false, options));
  },

  dismiss(id?: Id) {
    toast.dismiss(id);
  },

  update(
    id: Id,
    options: ToastOptions & {
      render?: string;
      type?: "default" | "success" | "error" | "info" | "warning";
      isLoading?: boolean;
    },
  ) {
    toast.update(id, options);
  },

  promise<T>(
    promise: Promise<T>,
    messages: {
      pending: string;
      success: string;
      error: string;
    },
    options?: NotifyOptions,
  ) {
    return toast.promise(promise, messages, options);
  },

  copied(label: string) {
    return toast.success(`${label} copied to clipboard`, withDuration(NOTIFY_DURATION.short));
  },

  engineOffline() {
    return toast.error("Cannot reach engine. Start it with `npm run engine:up`.", withDuration(NOTIFY_DURATION.long));
  },

  engineBusy() {
    return toast.warning(
      "Connection lost — the engine may still be working. Check `npm run engine:logs` before retrying.",
      withDuration(NOTIFY_DURATION.long),
    );
  },
};