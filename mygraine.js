function intensityName(intensity) {
	return ["Very mild", "Mild", "Medium", "Strong", "Very strong"][intensity - 1];
}
{
const $f = Mavo.Functions;
const $u = $f.util;
const val = Mavo.value;

// Returns an array of dates, one for each day between two dates
function getDays(from, to) {
	from = $f.date(from);

	if (to) {
		to = $f.date(to);
	}
	else {
		return [from];
	}

	let ret = [];

	let dayCount = $f.days($f.subtract(to, from));

	for (let i=0; i<=dayCount; i++) {
		let date = $f.date($f.addition(from, i * $f.days()));
		ret.push(date);
	}

	return ret;
}

// entries are sorted by day
// all have dates but some don't have endDates
function byDay(entries, ...options) {
	let o = $f.group(...options);

	// Drop nulls
	entries = $f.condense(entries);

	let first = entries[0];
	let last = entries[entries.length - 1];
	let isRange = "endDate" in first;
	let hasTimes = "startTime" in first;

	if ($f.gt(first.date, last.date)) {
		// Sorted in reverse chronological order
		entries = entries.reverse();
		[first, last] = [last, first];
	}

	let to = val(o.to) || Mavo.Functions.$today;
	let from;

	if (o.last) {
		from = $f.date($f.subtract(to, o.last));
	}
	else {
		from = val(o.from) || first.date;
	}

	let dayCount = $f.days($f.subtract(to, from));
	let ret = [];

	let days = Object.fromEntries(getDays(from, to).map(day => [day, []]));

	for (let entry of entries) {
		let startDate = val(entry.date);
		let startTime = val(entry.startTime);
		let endTime = val(entry.endTime);
		let endDate = endTime || !hasTimes? val(entry.endDate) : null;

		let dayRange = getDays(startDate, endDate);
		let longestSegment;

		for (let i=0; i<dayRange.length; i++) {
			let day = dayRange[i];
			let copy = {};
			copy.originalEntry = entry;

			if (i === 0) {
				copy.overlapStart = startDate + "T" + (startTime || "00:00");
			}
			else {
				copy.overlapStart = startDate + "T00:00";
			}

			if (i === dayRange.length - 1) {
				copy.overlapEnd = endDate + "T" + (endTime || "23:59");
			}
			else {
				copy.overlapEnd = endDate + "T23:59";
			}

			copy.overlapDuration = $f.subtract(copy.overlapEnd, copy.overlapStart);

			if (!longestSegment || longestSegment.overlapDuration < copy.overlapDuration) {
				longestSegment = copy;
			}

			if (i === 0) {
				// Started on this day
				if (dayRange.length === 1) {
					// Is entirely contained by this day
					copy.overlap = "contain";
				}
				else {
					// Spans multiple days
					copy.overlap = "start";
				}
			}
			else {
				if (i === dayRange.length - 1) {
					// Ended on this day
					copy.overlap = "end";
				}
				else {
					// Spans this day
					copy.overlap = "span";
				}
			}

			Object.assign(copy, entry);
			copy.endTime ??= entry.endTime || null;
			copy.isLongestSegment = false;

			days[day]?.push(copy);
		}

		longestSegment.isLongestSegment = true;
	}

	return Object.entries(days).map(([date, $items]) => {
		return { date, $items };
	});
}
}
