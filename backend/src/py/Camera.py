
import cv2
from pyzbar.pyzbar import decode

cap = cv2.VideoCapture(1)

stored_code = []
scanned_code = []

message = "There is a mix-up code detected! Please separate the products."
sign = ["="*40, "-"*40]

def printDisplay(message, my_list):
    print(f"{sign[1]}\n{message}\n\t", "\n\t".join(stored_code))

while True:

    ret, frame = cap.read()

    if not ret:
        print("Could not access camera")
        break

    decoded = decode(frame)

    for barcode in decoded:

        x, y, w, h = barcode.rect

        cv2.rectangle(
            frame,
            (x, y),
            (x + w, y + h),
            (0, 255, 0),
            3
        )

        code = barcode.data.decode("utf-8")

        cv2.putText(
            frame,
            code,
            (x, y - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 255, 0),
            2
        )

    cv2.imshow("My Camera", frame)

    key = cv2.waitKey(1) & 0xFF

    if key == ord(" "):

        print("\nScanning...")

        if not decoded:
            print("No barcode detected.")
            continue

        scanned_code.clear()

        for barcode in decoded:

            code = barcode.data.decode("utf-8")

            if code not in scanned_code:
                scanned_code.append(code)

        print("Scanned:", scanned_code)

        check = [
                    all(code in stored_code for code in scanned_code),
                    all(value not in stored_code for value in scanned_code)
                ]

        if all(check):

            print(f"""
            {sign[0]}
            WARNING!
            {sign[1]}
            {message}
            {sign[0]}
            """)

            printDisplay("Scanned codes:", scanned_code)
            printDisplay("Current storage:", stored_code)

        elif check[0]:

            print(f"\n{sign[0]}\nPRODUCT OUT\n{sign[0]}")

            printDisplay("Code/s released:", scanned_code)
            printDisplay("Current storage:", stored_code)

        elif check[1]:

            stored_code.extend(scanned_code)

            print(f"\n{sign[0]}\nPRODUCT IN\n{sign[0]}")

            printDisplay("New code/s added", scanned_code)
            printDisplay("Current storage:", stored_code)

    elif key == ord("q"):

        break

cv2.destroyAllWindows()
cap.release()