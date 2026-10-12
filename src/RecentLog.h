#pragma once

// Find the last records without scanning the entire log. end is a snapshot
// boundary, so appending records does not move an in-progress page.
template <typename LogFile>
bool findRecentLogStart(LogFile &file, size_t end, size_t records, size_t &start)
{
	char block[512];
	size_t position = end;
	size_t found = 0;
	bool haveRecord = false;
	while (position > 0)
	{
		size_t length = position < sizeof(block) ? position : sizeof(block);
		position -= length;
		if (!file.seek(position) || file.readBytes(block, length) != length)
			return false;
		for (size_t i = length; i > 0; --i)
		{
			char ch = block[i - 1];
			if (ch == '\n')
			{
				if (haveRecord && ++found == records)
				{
					start = position + i;
					return true;
				}
				haveRecord = false;
			}
			else if (ch != '\r')
				haveRecord = true;
		}
		yield();
	}
	start = 0;
	return true;
}
