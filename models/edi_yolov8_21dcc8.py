import kagglehub
rohitsuresh15_radroad_anomaly_detection_path = kagglehub.dataset_download('rohitsuresh15/radroad-anomaly-detection')
print('Data source import complete.')
import numpy as np 
import pandas as pd 
import os
for dirname, _, filenames in os.walk('/kaggle/input'):
    for filename in filenames:
        print(os.path.join(dirname, filename))

import os
HOME = os.getcwd()
print(HOME)

from IPython import display
display.clear_output()

import ultralytics
ultralytics.checks()
import ultralytics
from ultralytics import YOLO

data_yaml_path = '/kaggle/input/radroad-anomaly-detection/images/data.yaml'

model = YOLO('yolov8n.pt')  
model.train(data=data_yaml_path, epochs=40, imgsz=640, batch=8, save_period=5)
model.train(data=data_yaml_path, epochs=35, imgsz=960, batch=8, save_period=5)
model.train(data=data_yaml_path, epochs=25, imgsz=1280, batch=8, save_period=5)
from IPython.display import Image, display
display(Image(filename='runs/detect/train/confusion_matrix.png', width=600))
print('Confusion matrix - image size 640, epoch 40')
print()
from IPython.display import Image, display
display(Image(filename='runs/detect/train/results.png', width=600))
print('image size 640, epoch 40')
print()
display(Image(filename='runs/detect/train/val_batch0_pred.jpg', width=600))
print('image size 640, epoch 40')
print()

!yolo task=detect mode=val model=runs/detect/train/weights/best.pt data=/kaggle/input/radroad-anomaly-detection/images/data.yaml
print()
!yolo task=detect mode=predict model=runs/detect/train/weights/best.pt conf=0.25 source=/kaggle/input/radroad-anomaly-detection/images/test/images
print()

# import cv2
# from ultralytics import YOLO

# model = YOLO('/kaggle/working/runs/detect/train2/weights/best.pt')  # Load your trained model

# cap = cv2.VideoCapture(0)  # Change the index if you have multiple cameras

# while True:
#     ret, frame = cap.read()
#     if not ret:
#         break

#     results = model(frame)  # Perform detection
#     annotated_frame = results.render()[0]  # Annotate frame

#     cv2.imshow('YOLOv8 Detection', annotated_frame)
#     if cv2.waitKey(1) & 0xFF == ord('q'):
#         break

# cap.release()
# cv2.destroyAllWindows()



import cv2
from ultralytics import YOLO
import matplotlib.pyplot as plt
from IPython.display import display, clear_output

model = YOLO('/kaggle/working/runs/detect/train/weights/best.pt')  
video_path = '/kaggle/input/radroad-anomaly-detection/videos_without_audio/10th July-20231125T045234Z-001/10th July/111_10-07-2023.mp4'  # Replace with your actual video file path
cap = cv2.VideoCapture(video_path)

frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fps = int(cap.get(cv2.CAP_PROP_FPS))

output_path = '/kaggle/working/runs/detect/train/output_video.mp4'
out = cv2.VideoWriter(output_path, cv2.VideoWriter_fourcc(*'mp4v'), fps, (frame_width, frame_height))

if not cap.isOpened():
    print("Error: Could not open video file")
else:
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        results = model(frame) 
        for result in results:
            for box in result.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = box.conf[0] 
                cls = int(box.cls[0])  

                cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (255, 0, 0), 2)
                label = f'{model.names[cls]} {conf:.2f}'
                cv2.putText(frame, label, (int(x1), int(y1) - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 0, 0), 2)

        out.write(frame)

    cap.release()
    out.release()
    print(f"Output video saved as '{output_path}'")