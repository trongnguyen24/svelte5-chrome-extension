// src/lib/transitions/slideScaleFade.js (Ví dụ về vị trí file)

import { cubicOut } from 'svelte/easing'; // Import easing function mặc định

/**
 * Transition tùy chỉnh kết hợp trượt, scale và thay đổi opacity.
 * Hoạt động cho cả `in:` và `out:`.
 *
 * @param {Element} node - Phần tử DOM được áp dụng transition.
 * @param {object} params - Các tham số tùy chỉnh.
 * @param {number} [params.delay=0] - Độ trễ trước khi bắt đầu (ms).
 * @param {number} [params.duration=400] - Thời gian diễn ra transition (ms).
 * @param {function} [params.easing=cubicOut] - Hàm easing function (vd: cubicOut từ svelte/easing).
 * @param {number} [params.x=0] - Khoảng cách trượt ngang (px). Dương là sang phải, âm là sang trái.
 * @param {number} [params.y=0] - Khoảng cách trượt dọc (px). Dương là xuống dưới, âm là lên trên.
 * @param {number} [params.opacity=0] - Giá trị opacity khởi đầu (cho `in`) hoặc kết thúc (cho `out`). Mặc định là 0 (hoàn toàn trong suốt).
 * @param {number} [params.scale=0] - Giá trị scale khởi đầu (cho `in`) hoặc kết thúc (cho `out`). Mặc định là 0 (kích thước bằng 0).
 * @returns {import('svelte/transition').TransitionConfig} - Cấu hình transition cho Svelte.
 */
export function slideScaleFade(
	node,
	{ delay = 0, duration = 300, easing = cubicOut, x = 0, y = 0, opacity = 0, scale = 0.9 }
) {
	const style = getComputedStyle(node);
	const target_opacity = +style.opacity; // Opacity cuối cùng của phần tử (thường là 1)
	const target_transform = style.transform === 'none' ? '' : style.transform; // Transform cuối cùng

	// Tính toán sự khác biệt so với trạng thái cuối cùng
	const opacity_diff = target_opacity * (1 - opacity); // Khác biệt opacity
	const scale_diff = 1 * (1 - scale); // Khác biệt scale (scale cuối cùng là 1)
	// x và y là độ lệch ban đầu/cuối cùng so với vị trí cuối

	return {
		delay,
		duration,
		easing,
		css: (t, u) => `
            transform-origin: center center; /* Đảm bảo scale từ tâm */
            transform: ${target_transform}
                       translate(${(1 - t) * x}px, ${(1 - t) * y}px)
                       scale(${1 - scale_diff * u});
            opacity: ${target_opacity - opacity_diff * u};
        `
		/*
         Giải thích logic nội suy (t chạy từ 0 đến 1, u = 1 - t):
         - t=0 (bắt đầu): u=1 => translate(x, y) scale(1 - scale_diff) => scale(scale), opacity(target - opacity_diff) => opacity(opacity)
         - t=1 (kết thúc): u=0 => translate(0, 0) scale(1), opacity(target)
         Hàm này nội suy TỪ trạng thái lệch (x, y, scale, opacity) VỀ trạng thái tự nhiên của phần tử.
         Svelte sử dụng nó cho cả IN (vào trạng thái tự nhiên) và OUT (ra khỏi trạng thái tự nhiên).
        */
	};
}
