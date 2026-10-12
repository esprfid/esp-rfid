#include <cassert>
#include <cstring>
#include <iostream>
#include <string>
void yield() {}
#include "../../src/RecentLog.h"

struct FakeFile {
    std::string contents;
    size_t position = 0, bytesRead = 0;
    bool seek(size_t offset) { position = offset; return offset <= contents.size(); }
    size_t readBytes(char *buffer, size_t length) {
        size_t available = contents.size() - position;
        size_t count = length < available ? length : available;
        memcpy(buffer, contents.data() + position, count);
        position += count;
        bytesRead += count;
        return count;
    }
};

int main() {
    FakeFile file;
    size_t start = 99;
    assert(findRecentLogStart(file, 0, 100, start) && start == 0);
    file.contents = "one\ntwo\n";
    assert(findRecentLogStart(file, file.contents.size(), 100, start) && start == 0);
    assert(findRecentLogStart(file, file.contents.size(), 1, start) && start == 4);
    file.contents = "one\ntwo";
    assert(findRecentLogStart(file, file.contents.size(), 1, start) && start == 4);
    file.contents = "one\r\n\r\ntwo\r\n";
    assert(findRecentLogStart(file, file.contents.size(), 1, start) && start == 7);
    file.contents.clear();
    size_t expectedRecent = 0, expectedOlder = 0;
    for (int i = 0; i < 3823; ++i) {
        if (i == 3723) expectedRecent = file.contents.size();
        if (i == 3623) expectedOlder = file.contents.size();
        file.contents += std::to_string(i) + std::string(95, 'x') + "\n";
    }
    file.bytesRead = 0;
    size_t snapshotEnd = file.contents.size();
    assert(findRecentLogStart(file, snapshotEnd, 100, start));
    assert(start == expectedRecent && file.bytesRead < 11000);
    assert(findRecentLogStart(file, start, 100, start) && start == expectedOlder);
    file.contents += "appended\n";
    assert(findRecentLogStart(file, snapshotEnd, 100, start) && start == expectedRecent);
    assert(!findRecentLogStart(file, file.contents.size() + 20, 100, start));
    std::cout << "PASS: recent/older boundaries, CRLF, empty logs, append snapshots and bounded reads\n";
}
